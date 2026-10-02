import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { PaystackService } from '../paystack/paystack.service';
import { PAYSTACK_SIGNATURE_HEADER } from '../paystack/paystack.constants';
import { INVALID_PAYSTACK_SIGNATURE } from './payments.constants';

@Injectable()
export class PaystackSignatureGuard implements CanActivate {
  constructor(private readonly paystackService: PaystackService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<RawBodyRequest<Request>>();
    const signature = request.header(PAYSTACK_SIGNATURE_HEADER);

    if (
      !request.rawBody ||
      !this.paystackService.isValidSignature(request.rawBody, signature)
    ) {
      throw new UnauthorizedException(INVALID_PAYSTACK_SIGNATURE);
    }
    return true;
  }
}
