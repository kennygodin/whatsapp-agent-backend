import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { PaystackError } from './paystack.error';
import {
  PAYSTACK_API_BASE_URL,
  PAYSTACK_CURRENCY,
  PAYSTACK_INITIALIZE_PATH,
  PAYSTACK_REQUEST_TIMEOUT_MS,
  PAYSTACK_VERIFY_PATH,
  paystackRequestFailed,
} from './paystack.constants';

interface PaystackResponse<T> {
  status: boolean;
  message: string;
  data: T;
}

export interface InitializeTransactionInput {
  email: string;
  amountKobo: number;
  reference: string;
  metadata: Record<string, string>;
}

@Injectable()
export class PaystackService {
  private readonly secretKey: string;

  constructor(configService: ConfigService) {
    this.secretKey = configService.getOrThrow<string>('paystack.secretKey');
  }

  async initializeTransaction(input: InitializeTransactionInput) {
    const data = await this.request<{
      authorization_url: string;
      reference: string;
    }>(PAYSTACK_INITIALIZE_PATH, {
      method: 'POST',
      body: JSON.stringify({
        email: input.email,
        amount: input.amountKobo,
        currency: PAYSTACK_CURRENCY,
        reference: input.reference,
        metadata: input.metadata,
      }),
    });
    return {
      authorizationUrl: data.authorization_url,
      reference: data.reference,
    };
  }

  async verifyTransaction(reference: string) {
    const data = await this.request<{
      status: string;
      amount: number;
      currency: string;
      reference: string;
      paid_at: string | null;
    }>(`${PAYSTACK_VERIFY_PATH}/${encodeURIComponent(reference)}`, {
      method: 'GET',
    });
    return {
      status: data.status,
      amountKobo: data.amount,
      currency: data.currency,
      reference: data.reference,
      paidAt: data.paid_at,
    };
  }

  isValidSignature(rawBody: Buffer, signature: string | undefined): boolean {
    if (!signature) {
      return false;
    }
    const expected = Buffer.from(
      createHmac('sha512', this.secretKey).update(rawBody).digest('hex'),
    );
    const received = Buffer.from(signature);
    return (
      expected.length === received.length && timingSafeEqual(expected, received)
    );
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    const response = await fetch(`${PAYSTACK_API_BASE_URL}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(PAYSTACK_REQUEST_TIMEOUT_MS),
    });
    const body = (await response.json()) as PaystackResponse<T>;
    if (!response.ok || !body.status) {
      throw new PaystackError(
        paystackRequestFailed(path, body.message),
        response.status,
      );
    }
    return body.data;
  }
}
