import { Module } from '@nestjs/common';
import { ApiKeyGuard } from './api-key.guard';
import { ApiKeysRepository } from './api-keys.repository';
import { ApiKeysService } from './api-keys.service';

@Module({
  providers: [ApiKeysRepository, ApiKeysService, ApiKeyGuard],
  exports: [ApiKeysService, ApiKeyGuard],
})
export class AuthModule {}
