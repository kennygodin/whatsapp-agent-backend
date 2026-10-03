import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import {
  PASSWORD_HASH_SCHEME,
  PASSWORD_KEY_LENGTH,
  PASSWORD_SALT_BYTES,
} from './auth.constants';

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keyLength: number,
) => Promise<Buffer>;

export async function hashPassword(password: string) {
  const salt = randomBytes(PASSWORD_SALT_BYTES);
  const hash = await scryptAsync(password, salt, PASSWORD_KEY_LENGTH);
  return [
    PASSWORD_HASH_SCHEME,
    salt.toString('hex'),
    hash.toString('hex'),
  ].join(':');
}

export async function verifyPassword(password: string, stored: string) {
  const [scheme, saltHex, hashHex] = stored.split(':');
  if (scheme !== PASSWORD_HASH_SCHEME || !saltHex || !hashHex) {
    return false;
  }

  const expected = Buffer.from(hashHex, 'hex');
  const actual = await scryptAsync(
    password,
    Buffer.from(saltHex, 'hex'),
    expected.length,
  );
  return timingSafeEqual(actual, expected);
}
