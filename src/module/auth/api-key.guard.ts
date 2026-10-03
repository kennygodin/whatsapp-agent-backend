import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiKeysService } from './api-keys.service';
import { BEARER_SCHEME, INVALID_API_KEY } from './auth.constants';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const [scheme, key] = (request.headers.authorization ?? '').split(' ');

    if (
      scheme !== BEARER_SCHEME ||
      !key ||
      !(await this.apiKeysService.isValidAdminKey(key))
    ) {
      throw new UnauthorizedException(INVALID_API_KEY);
    }
    return true;
  }
}
