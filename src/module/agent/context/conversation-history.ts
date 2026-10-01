import { MessageDirection } from '../../../generated/prisma/client';
import type { Message } from '../../../generated/prisma/client';
import type { ChatMessage } from '../llm/llm.types';
import {
  MAX_HISTORY_MESSAGE_CHARS,
  MEDIA_PLACEHOLDER,
} from '../agent.constants';

type HistoryRole = 'user' | 'assistant';

function toText(message: Message): string {
  const body = message.body.trim().slice(0, MAX_HISTORY_MESSAGE_CHARS);
  if (!message.hasMedia) {
    return body;
  }
  return body ? `${body}\n${MEDIA_PLACEHOLDER}` : MEDIA_PLACEHOLDER;
}

export function toChatHistory(messages: Message[]): ChatMessage[] {
  const turns: { role: HistoryRole; text: string }[] = [];

  for (const message of messages) {
    const text = toText(message);
    if (!text) {
      continue;
    }
    const role: HistoryRole =
      message.direction === MessageDirection.inbound ? 'user' : 'assistant';

    const previous = turns.at(-1);
    if (previous?.role === role) {
      previous.text = `${previous.text}\n${text}`;
    } else {
      turns.push({ role, text });
    }
  }

  while (turns[0]?.role === 'assistant') {
    turns.shift();
  }

  return turns.map((turn) =>
    turn.role === 'user'
      ? { role: 'user', content: turn.text }
      : { role: 'assistant', content: turn.text },
  );
}
