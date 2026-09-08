import { randomUUID } from 'node:crypto';
import { ConflictException } from '@nestjs/common';
import {
  AuthIdentity,
  type AuthIdentityProps,
  type NewAuthIdentity,
} from '../../domain/entities/auth-identity.js';
import type { AuthIdentityRepository } from '../../domain/repositories/auth-identity.repositories.js';
import type { AuthProvider } from '../../domain/enums/auth-provider.enums.js';
export class MemoryAuthIdentityRepository implements AuthIdentityRepository {
  private readonly rows = new Map<string, AuthIdentityProps>();
  async findBySubjectAndProvider(subjectId: string, provider: AuthProvider) {
    const row = [...this.rows.values()].find(
      (value) => value.subjectId === subjectId && value.provider === provider,
    );
    return row ? AuthIdentity.reconstitute(row) : null;
  }
  async createIfAbsent(input: NewAuthIdentity) {
    const row = [...this.rows.values()].find(
      (value) =>
        value.provider === input.provider &&
        (value.subjectId === input.subjectId ||
          value.providerSubject === input.providerSubject),
    );
    if (row) {
      if (row.subjectId !== input.subjectId)
        throw new Error('Super admin email belongs to another identity');
      return AuthIdentity.reconstitute(row);
    }
    return this.create(input);
  }
  async findById(id: string) {
    const row = this.rows.get(id);
    return row ? AuthIdentity.reconstitute(row) : null;
  }
  async findByProvider(provider: AuthProvider, subject: string) {
    const row = [...this.rows.values()].find(
      (v) => v.provider === provider && v.providerSubject === subject,
    );
    return row ? AuthIdentity.reconstitute(row) : null;
  }
  async create(input: NewAuthIdentity) {
    if (
      [...this.rows.values()].some(
        (v) =>
          v.provider === input.provider &&
          (v.providerSubject === input.providerSubject ||
            v.subjectId === input.subjectId),
      )
    )
      throw new ConflictException('Identity already exists');
    const identity = AuthIdentity.reconstitute({ ...input, id: randomUUID() });
    return this.save(identity);
  }
  async save(identity: AuthIdentity) {
    this.rows.set(identity.id, identity.toPrimitives());
    return AuthIdentity.reconstitute(identity.toPrimitives());
  }
}
