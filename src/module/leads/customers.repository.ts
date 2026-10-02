import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CustomersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.customer.findUnique({ where: { id } });
  }

  upsertByPhone(phone: string, name?: string) {
    return this.prisma.customer.upsert({
      where: { phone },
      update: name ? { name } : {},
      create: { phone, name },
    });
  }
}
