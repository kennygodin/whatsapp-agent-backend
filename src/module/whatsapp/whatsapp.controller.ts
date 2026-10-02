import {
  Body,
  Controller,
  Header,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { TwilioSignatureGuard } from './guards/twilio-signature.guard';
import { WhatsappService } from './whatsapp.service';
import {
  EMPTY_TWIML_RESPONSE,
  STATUS_CALLBACK_PATH,
  WHATSAPP_WEBHOOK_ROUTE,
} from './whatsapp.constants';
import { SkipTransform } from '../../common/decorators/skip-transform.decorator';

@Controller(WHATSAPP_WEBHOOK_ROUTE)
export class WhatsappController {
  constructor(private readonly whatsappService: WhatsappService) {}

  @Post()
  @UseGuards(TwilioSignatureGuard)
  @HttpCode(HttpStatus.OK)
  @Header('Content-Type', 'text/xml')
  @SkipTransform()
  async receive(@Body() payload: Record<string, string>) {
    await this.whatsappService.enqueueInbound(payload);
    return EMPTY_TWIML_RESPONSE;
  }

  @Post(STATUS_CALLBACK_PATH)
  @UseGuards(TwilioSignatureGuard)
  @HttpCode(HttpStatus.OK)
  @SkipTransform()
  async receiveStatus(@Body() payload: Record<string, string>) {
    await this.whatsappService.recordDeliveryStatus(payload);
    return '';
  }
}
