import { describe, expect, it } from 'bun:test';
import {
  MessageDirection,
  MessageStatus,
} from '../../../generated/prisma/client';
import type { Message } from '../../../generated/prisma/client';
import {
  MAX_HISTORY_MESSAGE_CHARS,
  MEDIA_PLACEHOLDER,
} from '../agent.constants';
import { toChatHistory } from './conversation-history';

let sequence = 0;

function message(
  direction: MessageDirection,
  body: string,
  overrides: Partial<Message> = {},
): Message {
  sequence += 1;
  return {
    id: `msg-${sequence}`,
    leadId: 'lead-1',
    direction,
    body,
    hasMedia: false,
    status:
      direction === MessageDirection.inbound
        ? MessageStatus.received
        : MessageStatus.sent,
    twilioSid: null,
    errorCode: null,
    processedAt: null,
    createdAt: new Date(2026, 9, 1, 10, 0, sequence),
    ...overrides,
  };
}

const inbound = (body: string, overrides?: Partial<Message>) =>
  message(MessageDirection.inbound, body, overrides);
const outbound = (body: string) => message(MessageDirection.outbound, body);

describe('toChatHistory', () => {
  it('maps inbound to user and outbound to assistant', () => {
    expect(
      toChatHistory([inbound('do you have chargers?'), outbound('Yes!')]),
    ).toEqual([
      { role: 'user', content: 'do you have chargers?' },
      { role: 'assistant', content: 'Yes!' },
    ]);
  });

  it('merges a burst of customer messages into one user turn', () => {
    expect(
      toChatHistory([
        inbound('hi'),
        inbound('how much?'),
        inbound('delivery?'),
      ]),
    ).toEqual([{ role: 'user', content: 'hi\nhow much?\ndelivery?' }]);
  });

  it('describes media so the model knows something was sent', () => {
    expect(
      toChatHistory([
        inbound('', { hasMedia: true }),
        inbound('is this one available?', { hasMedia: true }),
      ]),
    ).toEqual([
      {
        role: 'user',
        content: `${MEDIA_PLACEHOLDER}\nis this one available?\n${MEDIA_PLACEHOLDER}`,
      },
    ]);
  });

  it('drops assistant messages at the start so history begins with the customer', () => {
    expect(toChatHistory([outbound('Hello!'), inbound('hi')])).toEqual([
      { role: 'user', content: 'hi' },
    ]);
  });

  it('truncates very long messages', () => {
    const [turn] = toChatHistory([inbound('x'.repeat(5000))]);
    expect(turn.role === 'user' && turn.content.length).toBe(
      MAX_HISTORY_MESSAGE_CHARS,
    );
  });
});
