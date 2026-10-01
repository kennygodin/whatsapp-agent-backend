import { Injectable } from '@nestjs/common';
import { Message, Prisma } from '../../generated/prisma/client';
import { PRISMA_UNIQUE_VIOLATION } from '../../common/common.constants';
import { MessagesRepository } from './messages.repository';

@Injectable()
export class MessagesService {
  constructor(private readonly messagesRepository: MessagesRepository) {}

  async recordInbound(data: {
    leadId: string;
    body: string;
    hasMedia: boolean;
    twilioSid: string;
  }): Promise<Message | null> {
    try {
      return await this.messagesRepository.createInbound(data);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === PRISMA_UNIQUE_VIOLATION
      ) {
        return null;
      }
      throw error;
    }
  }

  findUnprocessedInbound(leadId: string) {
    return this.messagesRepository.findUnprocessedInbound(leadId);
  }

  markProcessed(ids: string[]) {
    return this.messagesRepository.markProcessed(ids);
  }

  async findRecent(leadId: string, limit: number) {
    const newestFirst = await this.messagesRepository.findRecent(leadId, limit);
    return newestFirst.reverse();
  }

  createReply(leadId: string, body: string, processedIds: string[]) {
    return this.messagesRepository.createOutboundAndMarkProcessed(
      leadId,
      body,
      processedIds,
    );
  }

  findForSend(id: string) {
    return this.messagesRepository.findWithCustomerPhone(id);
  }

  markSent(id: string, twilioSid: string) {
    return this.messagesRepository.markSent(id, twilioSid);
  }

  markFailed(id: string, errorCode: string | null) {
    return this.messagesRepository.markFailed(id, errorCode);
  }
}
