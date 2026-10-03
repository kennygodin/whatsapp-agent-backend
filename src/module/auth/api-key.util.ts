import { createHash, randomBytes } from 'node:crypto';
import {
  API_KEY_DISPLAY_LENGTH,
  API_KEY_PREFIX,
  API_KEY_RANDOM_BYTES,
} from './auth.constants';

export function hashApiKey(key: string) {
  return createHash('sha256').update(key).digest('hex');
}

export function generateApiKey() {
  const key =
    API_KEY_PREFIX + randomBytes(API_KEY_RANDOM_BYTES).toString('base64url');
  return {
    key,
    prefix: key.slice(0, API_KEY_DISPLAY_LENGTH),
    keyHash: hashApiKey(key),
  };
}
