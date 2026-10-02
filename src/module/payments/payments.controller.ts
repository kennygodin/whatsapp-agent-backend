import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { PaystackSignatureGuard } from './paystack-signature.guard';
import { PaymentsService } from './payments.service';
import { PAYSTACK_WEBHOOK_ROUTE } from './payments.constants';

@Controller(PAYSTACK_WEBHOOK_ROUTE)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @UseGuards(PaystackSignatureGuard)
  @HttpCode(HttpStatus.OK)
  async receive(@Body() payload: Record<string, unknown>) {
    await this.paymentsService.handleWebhook(payload);
    return { received: true };
  }
}
