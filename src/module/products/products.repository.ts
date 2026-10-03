import { Injectable } from '@nestjs/common';
import { ProductStatus } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ProductsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findActiveById(id: string) {
    return this.prisma.product.findFirst({
      where: { id, status: ProductStatus.active },
    });
  }

  findAll() {
    return this.prisma.product.findMany({ orderBy: { name: 'asc' } });
  }

  searchActive(terms: string[], limit: number) {
    return this.prisma.product.findMany({
      where: {
        status: ProductStatus.active,
        OR: terms.flatMap((term) => [
          { name: { contains: term, mode: 'insensitive' as const } },
          { description: { contains: term, mode: 'insensitive' as const } },
        ]),
      },
      orderBy: { name: 'asc' },
      take: limit,
    });
  }
}
