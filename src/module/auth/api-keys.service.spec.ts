import { describe, expect, it } from 'bun:test';
import { Role } from '../../generated/prisma/client';
import type { ApiKeysRepository } from './api-keys.repository';
import { ApiKeysService } from './api-keys.service';
import { generateApiKey, hashApiKey } from './api-key.util';

function build(stored: { keyHash: string; role: Role } | null) {
  const lookups: string[] = [];
  const used: string[] = [];
  const repository = {
    findActiveByHash: async (keyHash: string) => {
      lookups.push(keyHash);
      return stored && stored.keyHash === keyHash
        ? { id: 'key-1', user: { role: stored.role } }
        : null;
    },
    markUsed: async (id: string) => {
      used.push(id);
    },
  } as unknown as ApiKeysRepository;
  return { service: new ApiKeysService(repository), lookups, used };
}

describe('ApiKeysService.isValidAdminKey', () => {
  const { key, keyHash } = generateApiKey();

  it('accepts an active admin key and records that it was used', async () => {
    const { service, used } = build({ keyHash, role: Role.admin });

    expect(await service.isValidAdminKey(key)).toBe(true);
    expect(used).toEqual(['key-1']);
  });

  it('only ever looks up the hash, never the raw key', async () => {
    const { service, lookups } = build({ keyHash, role: Role.admin });
    await service.isValidAdminKey(key);

    expect(lookups).toEqual([hashApiKey(key)]);
    expect(lookups[0]).not.toContain(key);
  });

  it('rejects an unknown or revoked key', async () => {
    const { service, used } = build(null);

    expect(await service.isValidAdminKey(key)).toBe(false);
    expect(used).toEqual([]);
  });

  it('rejects a value without the key prefix without querying the database', async () => {
    const { service, lookups } = build({ keyHash, role: Role.admin });

    expect(await service.isValidAdminKey('not-a-key')).toBe(false);
    expect(lookups).toEqual([]);
  });
});
