import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ApiKeysRepository {
  constructor(private readonly prisma: PrismaService) {}

  findActiveByHash(keyHash: string) {
    return this.prisma.apiKey.findFirst({
      where: { keyHash, revokedAt: null },
      include: { user: { select: { role: true } } },
    });
  }

  markUsed(id: string) {
    return this.prisma.apiKey.update({
      where: { id },
      data: { lastUsedAt: new Date() },
    });
  }
}
