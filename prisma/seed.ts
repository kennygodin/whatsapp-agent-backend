import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { Logger } from '@nestjs/common';
import { PrismaClient, Role } from '../src/generated/prisma/client';
import { hashPassword } from '../src/module/auth/password.util';
import { MIN_PASSWORD_LENGTH } from '../src/module/auth/auth.constants';
import {
  ADMIN_CREDENTIALS_MISSING,
  DATABASE_URL_MISSING,
  SEED_PRODUCTS,
  adminPasswordTooShort,
  seededAdminMessage,
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

async function seedProducts() {
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

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error(ADMIN_CREDENTIALS_MISSING);
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(adminPasswordTooShort(MIN_PASSWORD_LENGTH));
  }

  await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      passwordHash: await hashPassword(password),
      role: Role.admin,
    },
  });
  logger.log(seededAdminMessage(email));
}

async function main() {
  await seedProducts();
  await seedAdmin();
}

main()
  .catch((error) => {
    logger.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
