import { Injectable } from '@nestjs/common';
import { Role } from '../../generated/prisma/client';
import { ApiKeysRepository } from './api-keys.repository';
import { hashApiKey } from './api-key.util';
import { API_KEY_PREFIX } from './auth.constants';

@Injectable()
export class ApiKeysService {
  constructor(private readonly apiKeysRepository: ApiKeysRepository) {}

  async isValidAdminKey(key: string): Promise<boolean> {
    if (!key.startsWith(API_KEY_PREFIX)) {
      return false;
    }

    const apiKey = await this.apiKeysRepository.findActiveByHash(
      hashApiKey(key),
    );
    if (!apiKey || apiKey.user.role !== Role.admin) {
      return false;
    }

    await this.apiKeysRepository.markUsed(apiKey.id);
    return true;
  }
}
