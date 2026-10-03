import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { Logger } from '@nestjs/common';
import { PrismaClient, Role } from '../src/generated/prisma/client';
import { generateApiKey } from '../src/module/auth/api-key.util';
import {
  API_KEY_USAGE,
  NO_ADMIN_USER,
  NO_API_KEYS,
  apiKeyCreatedMessage,
  apiKeyListLine,
  apiKeyRevokedMessage,
} from './scripts.constants';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? '' }),
});
const logger = new Logger('ApiKey');

async function create(name: string) {
  const admin = await prisma.user.findFirst({ where: { role: Role.admin } });
  if (!admin) {
    throw new Error(NO_ADMIN_USER);
  }

  const { key, prefix, keyHash } = generateApiKey();
  await prisma.apiKey.create({
    data: { userId: admin.id, name, prefix, keyHash },
  });
  logger.log(apiKeyCreatedMessage(name, key));
}

async function list() {
  const keys = await prisma.apiKey.findMany({ orderBy: { createdAt: 'asc' } });
  if (keys.length === 0) {
    logger.log(NO_API_KEYS);
  }
  for (const key of keys) {
    logger.log(apiKeyListLine(key));
  }
}

async function revoke(prefix: string) {
  const { count } = await prisma.apiKey.updateMany({
    where: { prefix, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  logger.log(apiKeyRevokedMessage(count, prefix));
}

async function main() {
  const [, , command, argument] = process.argv;
  if (command === 'create' && argument) {
    return create(argument);
  }
  if (command === 'list') {
    return list();
  }
  if (command === 'revoke' && argument) {
    return revoke(argument);
  }
  logger.warn(API_KEY_USAGE);
}

main()
  .catch((error) => {
    logger.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
