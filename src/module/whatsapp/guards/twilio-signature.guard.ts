import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import twilio from 'twilio';
import {
  INVALID_TWILIO_SIGNATURE,
  TWILIO_SIGNATURE_HEADER,
} from '../whatsapp.constants';

@Injectable()
export class TwilioSignatureGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const signature = request.header(TWILIO_SIGNATURE_HEADER);
    if (!signature) {
      throw new ForbiddenException(INVALID_TWILIO_SIGNATURE);
    }

    const url = `${this.configService.getOrThrow<string>('app.publicBaseUrl')}${request.originalUrl}`;
    const isValid = twilio.validateRequest(
      this.configService.getOrThrow<string>('twilio.authToken'),
      signature,
      url,
      request.body as Record<string, string>,
    );

    if (!isValid) {
      throw new ForbiddenException(INVALID_TWILIO_SIGNATURE);
    }
    return true;
  }
}
