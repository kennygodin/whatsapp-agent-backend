import { describe, expect, it } from 'bun:test';
import type { ConfigService } from '@nestjs/config';
import { createHmac } from 'node:crypto';
import { PaystackService } from './paystack.service';

const SECRET = 'sk_test_example';
const service = new PaystackService({
  getOrThrow: () => SECRET,
} as unknown as ConfigService);

const body = Buffer.from(
  JSON.stringify({ event: 'charge.success', data: { reference: 'ord-1' } }),
);
const sign = (raw: Buffer, key = SECRET) =>
  createHmac('sha512', key).update(raw).digest('hex');

describe('PaystackService.isValidSignature', () => {
  it('accepts a body signed with our secret key', () => {
    expect(service.isValidSignature(body, sign(body))).toBe(true);
  });

  it('rejects a missing signature', () => {
    expect(service.isValidSignature(body, undefined)).toBe(false);
  });

  it('rejects a body changed after signing', () => {
    const tampered = Buffer.from(body.toString().replace('ord-1', 'ord-2'));
    expect(service.isValidSignature(tampered, sign(body))).toBe(false);
  });

  it('rejects a signature made with another key', () => {
    expect(service.isValidSignature(body, sign(body, 'sk_test_other'))).toBe(
      false,
    );
  });
});
