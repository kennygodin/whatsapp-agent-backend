import { ConfigService } from '@nestjs/config';
import type { RedisOptions } from 'bullmq';
import { FLY_PRIVATE_HOST_SUFFIX } from '../common.constants';

export function redisConnectionOptions(config: ConfigService): RedisOptions {
  const host = config.getOrThrow<string>('redis.host');
  return {
    host,
    port: config.getOrThrow<number>('redis.port'),
    password: config.get<string>('redis.password') || undefined,
    ...(host.endsWith(FLY_PRIVATE_HOST_SUFFIX) ? { family: 6 } : {}),
  };
}
