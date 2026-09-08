import { AuthIdentityMapper } from './mappers/auth-identity.mapper.js';
import { AuthProvider } from '../../domain/enums/auth-provider.enums.js';
import { randomUUID } from 'node:crypto';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { AuthIdentityEntity } from './typeorm/auth-identity.entity.js';
import {
  AuthIdentity,
  type NewAuthIdentity,
} from '../../domain/entities/auth-identity.js';
import { AuthIdentityRepository } from '../../domain/repositories/auth-identity.repositories.js';

export class TypeormAuthIdentityRepository implements AuthIdentityRepository {
  constructor(
    @InjectRepository(AuthIdentityEntity)
    private readonly repo: Repository<AuthIdentityEntity>,
  ) {}

  private read(entity: AuthIdentityEntity | null) {
    return entity ? AuthIdentityMapper.toDomain(entity) : null;
  }

  async findById(id: string) {
    const entity = await this.repo.findOne({ where: { id } });
    return this.read(entity);
  }
  async findByProvider(provider: AuthProvider, providerSubject: string) {
    const entity = await this.repo.findOne({
      where: { provider: provider, providerSubject },
    });
    return this.read(entity);
  }
  async findBySubjectAndProvider(subjectId: string, provider: AuthProvider) {
    const entity = await this.repo.findOne({ where: { subjectId, provider } });
    return this.read(entity);
  }

  async create(input: NewAuthIdentity) {
    const id = randomUUID();
    const entity = AuthIdentityMapper.toPersistence(input, id);
    await this.repo.save(entity);
    return (await this.findById(id))!;
  }

  async createIfAbsent(input: NewAuthIdentity) {
    return this.repo.manager.transaction(async (manager) => {
      await manager
        .createQueryBuilder()
        .insert()
        .into(AuthIdentityEntity)
        .values(AuthIdentityMapper.toPersistence(input, randomUUID()))
        .orIgnore()
        .execute();
      let entity = await manager.findOne(AuthIdentityEntity, {
        where: {
          provider: input.provider,
          providerSubject: input.providerSubject,
        },
      });
      if (!entity) {
        entity = await manager.findOne(AuthIdentityEntity, {
          where: { provider: input.provider, subjectId: input.subjectId },
        });
      }
      const identity = this.read(entity ?? null);
      if (!identity || identity.subjectId !== input.subjectId)
        throw new Error('Super admin email belongs to another identity');
      return identity;
    });
  }

  async save(identity: AuthIdentity) {
    const value = identity.toPrimitives();
    await this.repo.update(value.id, {
      updatedAt: value.updatedAt.getTime(),
      lastAuthenticatedAt: value.lastAuthenticatedAt
        ? value.lastAuthenticatedAt.getTime()
        : null,
    });
    const saved = await this.findById(identity.id);
    if (!saved) throw new Error('Identity does not exist');
    return saved;
  }
}
