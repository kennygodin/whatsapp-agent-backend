import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { Logger } from '@nestjs/common';
import { PrismaClient } from '../src/generated/prisma/client';
import {
  DATABASE_URL_MISSING,
  SEED_PRODUCTS,
  seededProductsMessage,
} from './seed.constants';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error(DATABASE_URL_MISSING);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const logger = new Logger('Seed');

async function main() {
  for (const product of SEED_PRODUCTS) {
    const { stock, ...details } = product;
    await prisma.product.upsert({
      where: { sku: product.sku },
      update: details,
      create: product,
    });
  }
  logger.log(seededProductsMessage(SEED_PRODUCTS.length));
}

main()
  .catch((error) => {
    logger.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
