import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CustomersRepository {
  constructor(private readonly prisma: PrismaService) {}

  upsertByPhone(phone: string, name?: string) {
    return this.prisma.customer.upsert({
      where: { phone },
      update: name ? { name } : {},
      create: { phone, name },
    });
  }
}
