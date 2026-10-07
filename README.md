# WhatsApp Sales Agent — Backend

An AI sales assistant that runs a Nigerian gadget store's WhatsApp inbox end to end: it answers
product questions, takes orders, sends Paystack payment links, confirms payment, and hands the chat
to a human the moment it should.

Built as a backend-only system — there is no custom chat UI. WhatsApp **is** the interface.

**Stack:** NestJS · TypeScript · PostgreSQL (Prisma) · Redis + BullMQ · Twilio WhatsApp · Paystack ·
Groq / Cerebras / Gemini · MCP · Fly.io · Bun

---

## Table of contents

1. [Architecture](#architecture)
2. [Webhook → queue → workers](#webhook--queue--workers)
3. [The agent / tool boundary](#the-agent--tool-boundary)
4. [Validation & guardrails](#validation--guardrails)
5. [Idempotency decisions](#idempotency-decisions)
6. [Payment flow](#payment-flow)
7. [Lead lifecycle & escalation](#lead-lifecycle--escalation)
8. [Admin surface (MCP)](#admin-surface-mcp)
9. [Tech stack](#tech-stack)
10. [Setup](#setup)
11. [Why these engineering decisions](#why-these-engineering-decisions)
12. [Project status](#project-status)

---

## Architecture

```
                         ┌──────────────────────────────────────────────────────┐
  Customer ──WhatsApp──▶ │  Twilio ──POST──▶ /api/v1/webhooks/whatsapp          │
                         │              TwilioSignatureGuard (HMAC)            │
                         └────────────────────────┬─────────────────────────────┘
                                                  │  respond 200 + empty TwiML
                                                  │  jobId = MessageSid  (dedupe)
                                                  ▼
   ┌───────────────────────────────────────────────────────────────────────────────┐
   │                              REDIS / BullMQ                                  │
   │                                                                               │
   │  whatsapp-intake ──▶ conversation-turn ──▶ whatsapp-outbound ──▶ Twilio API   │
   │   (conc 1)            (conc 5, debounce)     (conc 1, 1 msg/3s)               │
   │                                                                               │
   │  payments ──▶ verify + record              lifecycle ──▶ nudges, drop-offs    │
   │  alerts   ──▶ email + WhatsApp alerts                                         │
   └───────────────────────────────────────────────────────────────────────────────┘
                                                  │
                       ┌──────────────────────────┼──────────────────────────┐
                       ▼                          ▼                          ▼
                 ┌─────────────┐          ┌──────────────┐          ┌──────────────┐
                 │  Postgres   │          │  Agent core  │          │  Providers   │
                 │   Prisma    │◀────────▶│  harness +   │◀────────▶│ Groq →       │
                 │             │          │  5 tools     │          │ Cerebras →   │
                 └─────────────┘          └──────────────┘          │ Gemini       │
                                                                   └──────────────┘

  Paystack ──POST──▶ /api/v1/webhooks/paystack ──▶ payments queue ──▶ verify ──▶ Postgres
  Admin    ──POST──▶ /api/v1/mcp   (Bearer admin API key, MCP Streamable HTTP)
```

Feature modules live under `src/module/*`, each split **repository** (Prisma calls only) and
**service** (business logic). Cross-cutting guards, interceptors, filters and decorators live in
`src/common/`.

```
src/
├── common/            # envelope interceptor, exception filter, queue consts, utils
├── config/            # registerAs-namespaced config, Joi env validation
├── generated/prisma/  # generated client (enums imported from here, never re-declared)
├── prisma/            # PrismaService
└── module/
    ├── whatsapp/      # webhook, guards, processors, debounce timing, formatting
    ├── agent/         # harness loop, LLM router, skills, grounding, tools
    ├── leads/         # customers + leads + funnel stage transitions
    ├── messages/      # inbound/outbound message persistence + delivery status
    ├── orders/        # order rules, row locking, payment recording
    ├── products/      # catalog
    ├── payments/      # Paystack webhook, signature guard, payment worker
    ├── paystack/      # Paystack HTTP client (initialize, verify, HMAC signature)
    ├── lifecycle/     # scheduled nudges + drop-offs
    ├── alerts/        # escalation → email + WhatsApp alerts
    ├── mcp/           # admin MCP server + tools
    ├── auth/          # admin users, API keys
    ├── mail/          # Resend
    └── twilio/        # Twilio send + error classification
```

Sibling repository: `whatsapp-agent/admin` holds the React + Vite dashboard (step 9, in progress).

---

## Webhook → queue → workers

**Nothing heavy happens inside the HTTP request.** The webhook validates the signature, enqueues a
job, and returns `200` with an empty TwiML document. Twilio gets its response in milliseconds; the
conversation is processed asynchronously.

| Queue | Concurrency | Job | What it does |
|---|---|---|---|
| `whatsapp-intake` | 1 | `inbound-message` | Upsert customer, open or reuse lead, record inbound message, schedule the turn |
| `conversation-turn` | 5 | `conversation-turn` | Debounce, build prompt, run the agent, persist the reply |
| `whatsapp-outbound` | 1, **1 msg / 3 s** | `send-message` | Send via Twilio, record the SID, classify permanent vs retryable failure |
| `payments` | — | `confirm-payment` | Verify against the Paystack API, record payment, notify or escalate |
| `alerts` | — | `email` / `whatsapp` | Deliver escalation alerts on both channels |
| `lifecycle` | — | `payment-nudges`, `drop-offs` | Scheduled scans every 10 minutes |

Global job options (`src/common/queue.constants.ts`): `attempts: 5`, exponential backoff starting
at 2 s, completed jobs removed after 1 h, failed jobs kept for 7 days.

### Adaptive quiet-period debounce

People type in bursts. Instead of replying to "hi" and then "how much" separately, the turn job is
enqueued with a 2 s delay and deduplicated **per lead** — then re-delayed until the customer
actually goes quiet.

| Last message ends with | Quiet period |
|---|---|
| `?` `!` `.` | 2 s |
| `,` `:` `-` `…`, or `and` `but` `so` `or` `because` `then` … | 8 s |
| anything else | 5 s |

Hard cap: **15 s** from the oldest unprocessed message, so a customer who keeps typing still gets
answered. Implemented as a pure function in `src/module/whatsapp/turn-timing.ts`, fully unit tested.

### Failure behaviour

- Every network call inside a processor is wrapped in an explicit timeout (`withTimeout`,
  `AbortSignal.timeout`). A hung Twilio or Paystack call would otherwise hold a job forever with no
  error and no retry — completely invisible.
- Twilio 4xx (except 429) → `UnrecoverableError`, no further retries, message marked `failed`.
  5xx and timeouts are retried with backoff.
- If the agent fails on its **final** attempt, the customer still gets a reply: the lead is
  escalated to a human and a fallback message is sent. There is no silent drop.

---

## The agent / tool boundary

This is the core design decision of the project.

> **The model decides _what_ to say. The server decides _what is true_ and _what happens_.**

The model never touches the database, never computes a price, and never sees stock quantities. It
can only call tools, and tools are ordinary NestJS services running with server-side authority.

### The loop

```
system prompt (stage skill + store facts)
  + conversation history (last 12 messages, 1000 chars each)
        │
        ▼
┌─ for iteration = 1 .. 5 ──────────────────────────────────────────────┐
│  provider.complete({ system, messages, tools })                       │
│                                                                       │
│  no tool calls ─▶ run grounding validation on the reply               │
│       valid   ─▶ return it                                           │
│       invalid ─▶ inject a correction and retry (max 1 correction,     │
│                  otherwise reject the reply entirely)                 │
│                                                                       │
│  tool calls ─▶ execute each tool, push results back as `tool` msgs    │
└───────────────────────────────────────────────────────────────────────┘
  cap reached ─▶ log, return null, caller falls back to a canned reply
```

### Tool catalog — what the model _can_ do

| Tool | Authority it hands to the server |
|---|---|
| `search_catalog` | Returns up to 5 real products. The **only** source of prices and availability. |
| `create_order` | Validates quantity (1–10), checks active stock, **computes the total itself**, replaces any unpaid order. |
| `get_order_status` | Reads orders straight from the DB — the model cannot guess order state. |
| `generate_payment_link` | Returns the cached link if one exists, otherwise initializes Paystack and attaches the reference. |
| `escalate_to_human` | Pauses the bot for this chat and fans out alerts. |

Every tool returns `{ ok: true, data }` or `{ ok: false, error }`. Bad model input raises a
`ToolInputError` that is fed **back to the model** as a corrective tool result, so the agent can
recover from its own mistake instead of failing the turn. Unexpected errors are logged and surfaced
as a generic "temporarily unavailable" string — internals never leak into the chat.

### What the model _cannot_ do

- State a price, stock level or feature that did not come from a `search_catalog` result.
- Invent a store policy — delivery fees, hours, address and socials come from a fixed
  `STORE_FACTS` block in the system prompt.
- Send a message outside the outbound queue (rate limited, recorded, retried, delivery tracked).
- Change a lead stage, mark an order paid, or resume its own paused conversation — those are server
  transitions in `LeadsService` and `OrdersService`.

### Multi-provider chain with cooldown

```
LLM_PROVIDER_CHAIN = groq,cerebras,gemini
```

`LlmRouter.run()` walks the chain in order and classifies every failure:

- **rate limited** → that provider goes into cooldown (from `Retry-After`, default 60 s, capped at
  15 min) and the next one is tried immediately — rate limits are normal, so the provider recovers
  for later turns instead of poisoning them
- **rejected** (bad key, model name or request shape) → log an error, move on
- **unavailable** (timeout / 5xx) → log a warning, move on

All providers down → `ALL_LLM_PROVIDERS_FAILED` → the turn falls back → the customer still gets a
reply.

`LLMProvider` is a three-method interface (`name`, `complete`, `LLMRequest → LLMResponse`) with a
**fake provider** shipped alongside the real ones, so tests and `scripts/llm-smoke-test.ts` run with
no API key at all.

### Skills

The system prompt is assembled per turn: a **base prompt** (tone, WhatsApp formatting rules,
honesty rules, store facts) plus a **stage skill** (`product_qa`, `order_collection`) selected from
the lead's current funnel stage. Conversation history is a neutral window of the last 12 messages —
failed outbound messages excluded, media collapsed to `[sent a photo, voice note or file]`, and
consecutive same-role messages merged so the model reads the chat as turns rather than raw rows.

---

## Validation & guardrails

| Layer | Mechanism |
|---|---|
| **Environment** | Joi through `ConfigModule.validate` at boot — missing or invalid config fails fast. LLM keys are required *only if* their provider is in the chain. |
| **HTTP in** | `ValidationPipe({ whitelist, forbidNonWhitelisted, transform })`. |
| **Webhook authenticity** | `TwilioSignatureGuard` — `twilio.validateRequest` over `PUBLIC_BASE_URL + originalUrl` plus the body. `PaystackSignatureGuard` — HMAC-SHA512 over the **raw body**, compared with `timingSafeEqual`. |
| **Admin API** | `ApiKeyGuard` — bearer key, stored as a SHA-256 hash alongside a display `prefix`, `revokedAt` and `lastUsedAt`. Never stored in plaintext. |
| **Model output → reply** | `findUngroundedPrices` — every `₦`/`NGN` amount in the reply must already exist in a tool result. `findUngroundedUrls` — every URL must appear in a tool result. A failure injects a correction; a second failure **rejects the reply** rather than sending it. |
| **Money** | Amounts stored in **kobo** (`Int`), formatted only at the edge. Payment is verified against Paystack's own `/transaction/verify` — the webhook payload is a *trigger*, never the source of truth. Currency must be `NGN`. |
| **Stock** | Decrement guarded by `stock >= quantity` inside the transaction; insufficient stock escalates instead of silently overselling. |
| **Prompt scope** | The model never sees stock numbers or internal instructions, and is told explicitly not to reveal them. |

---

## Idempotency decisions

Webhooks are delivered at least once, and several of these paths can fire twice. Each one has a
deliberately different answer:

| Path | Strategy | Why this one |
|---|---|---|
| **Inbound WhatsApp** | BullMQ `jobId = MessageSid` **plus** a unique `twilioSid` column | Job-level dedupe covers the queue; the unique constraint is the real guarantee, since a job ID can be re-added once retention expires. `P2002` → `recordInbound` returns `null` → no double processing. |
| **Conversation turn** | `deduplication: { id: leadId, keepLastIfActive: true }` | One turn per lead at a time. Newer messages re-schedule the same job instead of spawning parallel replies. |
| **Outbound send** | `jobId = message.id` **plus** a status gate (sends only while `status === queued`) | A re-run cannot send the same message twice — the status has already moved to `sent`. |
| **Paystack webhook** | `jobId = paystack-<reference>` | The same `charge.success` arriving five times enqueues exactly one verification job. |
| **Payment recording** | Conditional `updateMany where status = pending` inside a transaction; `count === 0 → already_paid` | A conditional write, not read-then-write. Stock only decrements once the row is actually claimed. |
| **Payment link creation** | `attachPaymentLink` conditioned on `paymentReference: null`; `count === 0 → ORDER_CHANGED` | Two concurrent requests → one initializes Paystack, the other returns the winner's link. |
| **Order creation** | `SELECT … FOR UPDATE` on the lead row, then cancel-and-replace the pending order | Concurrent `create_order` calls serialize on the lead. Same product + quantity returns the existing order rather than duplicating it. |
| **Payment nudge** | `claimNudge` → `updateMany where nudgedAt: null` | Two overlapping scheduler runs cannot double-text the customer. |
| **Escalation** | `pauseForEscalation` guarded update; `count === 0 → already escalated` | Alert jobs carry `channel-leadId-timestamp` IDs so one escalation fans out each channel exactly once. |
| **Delivery status** | `updateStatusBySid` conditioned on allowed prior statuses | Twilio can callback `delivered` then `read`; a late `sent` cannot regress a `delivered`. |
| **Alert email** | Resend idempotency key = job id | Provider-level dedupe on top of job-level dedupe. |

---

## Payment flow

```
create_order ──▶ pending order (server-computed total, in kobo)
                      │
      generate_payment_link
                      │   reference = paymentReference(orderId)
                      ▼
      Paystack /transaction/initialize ──▶ authorization_url stored on the order
                      │
      link sent to the customer (exact URL, link grounding enforced)
                      │
      customer pays ──▶ Paystack ──▶ POST /api/v1/webhooks/paystack
                      │     HMAC-SHA512 verified over the raw body
                      │     jobId = paystack-<reference>
                      ▼
      payments queue ──▶ /transaction/verify
                         (server re-verifies status, amount, currency)
                      ▼
      recordPayment → one transaction:
        ├─ order pending → paid, stock decremented (conditional)
        ├─ lead → converted
        └─ outcome:
             paid              → confirmation sent on WhatsApp
             already_paid      → no-op (duplicate webhook)
             unknown_reference → warn and drop
             amount_mismatch   → escalate + "needs review" reply
             paid_cancelled    → escalate + "needs review" reply
             out of stock      → escalate (the customer has already paid)
```

Two invariants worth calling out:

1. **The amount that settles the order is the amount Paystack returns on verify**, compared against
   `order.totalAmount`. A tampered or replayed webhook cannot mark an order paid for free.
2. **An unpaid order is disposable; a paid one is not.** `create_order` cancels and replaces a
   pending order, while `recordPayment` refuses to touch a cancelled order and escalates instead.

---

## Lead lifecycle & escalation

**Funnel stages** (a Prisma enum — validation and any external-facing list derive from
`Object.values(LeadStage)` rather than a hand-maintained array):

```
new ──▶ engaged ──▶ order_started ──▶ converted
  └──────────────────────────────▶ dropped_off
```

Transitions are **code-driven**: services decide, and `StageTransition` records an audit row. The
model has no way to move a lead.

**Escalation** (`escalate_to_human`, a failed final turn, or a payment anomaly):

1. `botMode → paused` via a conditional update — idempotent
2. `escalatedAt` and `escalationReason` recorded on the lead
3. Alerts fanned out to the `alerts` queue on **both** channels: a Resend email and a WhatsApp
   message to the ops number, each carrying the customer, phone, reason and Lagos-local timestamp
4. The bot tells the customer a team member will take over, and **stops replying** to that chat
5. Resumption happens through the admin MCP `resume_conversation` tool — the bot never unpauses
   itself

**Scheduled lifecycle jobs** (every 10 minutes, batched 50):

- **Payment nudges** — orders whose link was sent at least 2 h ago, only if the customer messaged
  within the last 23 h (so the message stays inside the WhatsApp customer-service window), claimed
  before sending
- **Drop-offs** — open leads with no inbound message for 24 h → `dropped_off`

---

## Admin surface (MCP)

A stateless **MCP server** over Streamable HTTP at `POST /api/v1/mcp`, guarded by a bearer admin
API key. There is no admin UI in this repository yet — you connect it to any MCP client.

| Tool | Purpose |
|---|---|
| `get_lead_funnel_stats` | Stage counts, conversion rate, revenue for the last N days, chats currently paused |
| `list_conversations` | Recent leads, filterable by `stage` / `botMode` (for example `paused` = waiting on a human) |
| `get_conversation_messages` | Full message thread with delivery status |
| `get_lead_orders` | Orders with status, reference, and link / reminder / payment timestamps |
| `list_products` | Full catalog with exact stock — admins see numbers, customers never do |
| `resume_conversation` | Hand a paused chat back to the bot |

`GET` and `DELETE` on the route return `405`: the server is stateless and JSON-RPC over `POST` only.
API keys are managed with `scripts/api-key.ts` (`create` / `list` / `revoke`).

---

## Tech stack

| Concern | Choice |
|---|---|
| Framework | NestJS + TypeScript, modules with a repository / service split |
| Runtime | Bun for tests, scripts and local runs; the Docker image runs `dist/main.js` |
| Database | PostgreSQL 16, Prisma with a generated client, uuid primary keys, `snake_case` table maps |
| Queue | Redis 7 + BullMQ — retries, backoff, rate limits, deduplication, job schedulers |
| WhatsApp | Twilio (inbound webhook, status callbacks, outbound send) |
| Payments | Paystack (initialize, verify, HMAC-SHA512 webhook signature) |
| LLM | Groq → Cerebras → Gemini behind one `LLMProvider` interface, plus a fake provider |
| MCP | `@modelcontextprotocol/sdk`, Streamable HTTP transport |
| Email | Resend |
| Config | `registerAs` namespaces loaded via `ConfigModule`, Joi validation at boot |
| HTTP envelope | `{ success, statusCode, data, meta? }` on success, `{ success:false, statusCode, timestamp, path, message }` on error |
| Tests | Bun test — 21 spec files including an integration spec against a real Postgres |
| Lint / format | oxlint, Prettier |
| Deploy | Fly.io (`whatsapp-agent-backend`, `lhr`) plus a separate Redis app (`whatsapp-agent-redis`) |

---

## Setup

### Prerequisites

Docker, [Bun](https://bun.sh), a Twilio WhatsApp number, a Paystack account, and at least one LLM
provider key.

### 1. Start local services

```bash
docker compose up -d postgres redis
```

Postgres runs on **5434** and Redis on **6381** on purpose, so a native `postgres` or `redis`
already on the default ports cannot shadow the containers silently. If something looks down, check
`lsof -i :5434` before assuming Docker is broken.

### 2. Install and configure

```bash
bun install          # runs `prisma generate` via postinstall
cp .env.example .env
```

Then fill in `.env`:

```bash
DATABASE_URL=postgresql://whatsapp_agent:whatsapp_agent@localhost:5434/whatsapp_agent?schema=public
REDIS_HOST=localhost
REDIS_PORT=6381

TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
PUBLIC_BASE_URL=...          # must match the URL Twilio posts to, for signature validation

LLM_PROVIDER_CHAIN=groq,cerebras,gemini
GROQ_API_KEY=...
CEREBRAS_API_KEY=...
GEMINI_API_KEY=...

PAYSTACK_SECRET_KEY=sk_test_...
RESEND_API_KEY=...
MAIL_FROM=...
ALERT_EMAIL=...
ALERT_WHATSAPP=...

ADMIN_EMAIL=...              # seeded admin, minimum length enforced
ADMIN_PASSWORD=...
```

### 3. Migrate, seed, run

```bash
bunx prisma migrate dev
bunx prisma generate          # migrate dev does not regenerate the client on its own
bunx prisma db seed           # 6 products + the admin user

bun run start:dev             # http://localhost:3000/api/v1
```

### 4. Test

```bash
bun run test                  # unit
bun run test:cov              # coverage
bun run test:integration      # needs the test database reachable on 5434
bun run lint
```

### 5. Point Twilio at it

Expose the app and set the WhatsApp inbound webhook to:

```
POST <PUBLIC_BASE_URL>/api/v1/webhooks/whatsapp
```

Delivery statuses are reported to `…/api/v1/webhooks/whatsapp/status`.

> The Twilio sandbox number expires membership every 3 days (error 63015), and messages outside the
> 24-hour customer-service window are rejected (error 63016).

### 6. Exercise it without a phone

```bash
bun run scripts/send-test-whatsapp.ts            # fake inbound payload → full pipeline
bun run scripts/llm-smoke-test.ts                # provider chain + search_catalog, no WhatsApp
bun run scripts/send-test-paystack-webhook.ts <reference>
bun run scripts/api-key.ts create <name>         # also: list, revoke
```

### Production

```bash
fly deploy                 # release_command runs `prisma migrate deploy && prisma db seed`
```

Redis runs as a separate Fly app (`infra/redis/`) with a password and AOF persistence. Its
`.internal` hostname is **IPv6-only**, so the client forces `family: 6` whenever the host ends in
`.internal` — otherwise DNS resolution fails even though the record genuinely exists.

---

## Why these engineering decisions

**The webhook returns immediately; work happens on a queue.** Twilio and Paystack both time out and
retry. Any LLM call, database write or rate limit inside the request risks a 500 → duplicate
delivery → double reply. Acknowledging in milliseconds and doing the work in a worker removes the
entire class of problem.

**Dedupe at the queue _and_ at the database.** Job IDs stop duplicates at BullMQ; unique columns and
conditional writes stop them at Postgres. Neither is sufficient alone — BullMQ job IDs expire with
`removeOnComplete`, and a database constraint cannot prevent a job from being enqueued at all.

**Per-lead turn deduplication with adaptive quiet periods.** A fixed delay either replies mid-typing
or feels sluggish. Re-delaying one deduplicated job per lead until the customer goes quiet — capped
at 15 s — produces one coherent reply per burst at any typing speed.

**One provider-neutral interface, a chain behind it, and a fake.** Free-tier LLM providers rate limit
constantly. A cooldown-aware chain turns that from an outage into a log line. The fake provider means
tests and CI never need a key. Callers depend on `LLMProvider`, not on any vendor, so adding or
swapping a provider is a one-line change in the factory.

**Grounding checks are code, not prompt.** Instructing a model to "only quote real prices" reduces
hallucination; it does not eliminate it. Extracting every naira amount and URL from the reply and
comparing it against tool results catches the failure *deterministically*, and rejecting the reply
after one failed correction means an ungrounded price never reaches a customer.

**Server-side pricing and stock.** A model should not be trusted to do arithmetic, and it should not
be the authority on inventory. `create_order` validates and computes the total itself, and
`search_catalog` is the only route to a price. The model chooses among verified facts; it does not
produce them.

**Verify payment with Paystack; never trust the webhook body.** The webhook supplies only a
reference. Amount, currency and status are re-read from `/transaction/verify`, then the order row is
claimed with a conditional update. Replays collapse into `already_paid`, and an amount mismatch
escalates instead of converting a lead.

**Escalation pauses the bot.** An automated agent confidently replying about a refund or a faulty
unit is a worse outcome than silence. Pausing `botMode` and alerting on two channels turns the
agent's limits into a designed handoff, and MCP `resume_conversation` makes the return explicit.

**Timeouts on every external call.** A hung HTTP call inside a worker with no timeout is a job that
never completes, never errors and never retries — completely invisible. Explicit timeouts plus
`attempts` and `backoff` make failure loud and bounded.

**Constants live in `*.constants.ts`.** Error messages, prompts, routes and fallback copy are named
exports in a per-module constants file. Prompts and user-facing strings stay reviewable in one
place, and enum-derived values are derived from the Prisma enum instead of duplicated by hand.

**`family: 6` for Fly private hostnames.** Fly `.internal` names are IPv6-only. Without forcing IPv6
the Redis connection fails while the DNS record demonstrably exists — a bug that looks like an
infrastructure failure but is one line of configuration.

**Bun for tests.** NestJS 12 is ESM-only and cannot load under Jest on Node 22; `bun test` runs the
same specs, including `Test.createTestingModule`, without a transpile shim.

---

## Project status

| # | Step | Status |
|---|---|---|
| 1 | Scaffold, env config, Docker Compose, response envelope | Done |
| 2 | Prisma schema, migrations, seed (6 products + admin) | Done |
| 3 | Twilio webhook, signature guard, intake queue, message persistence, deployed to Fly | Done |
| 4 | `LLMProvider` (fake first), harness loop, Gemini, LLM chain and router | Done |
| 5 | Tools, skills, grounding guards, ordering, escalation, delivery status, formatting, fallbacks | Done |
| 6 | Paystack initialize / webhook / verify, atomic payment + stock, lead conversion | Done |
| 7 | BullMQ lifecycle jobs — payment nudges and inactive lead drop-off | Done |
| 8 | Admin API keys and MCP server (6 tools, Streamable HTTP) | Done |
| 9 | React + Vite admin dashboard | In progress |

---

## License

UNLICENSED — private project.
