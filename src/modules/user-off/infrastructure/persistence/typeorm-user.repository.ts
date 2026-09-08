import { Repository, QueryFailedError } from 'typeorm';
import { UserEntity } from './typeorm/user.entity.js';
import { User } from '../../domain/entities/user.entity.js';
import { GlobalRole } from '../../domain/enum/global-role.enum.js';
import { Email } from '../../domain/value-objects/email.js';
import type { UserRepository } from '../../domain/repositories/i-user.repository.js';
import { SuperAdminEmailConflictException } from '../../domain/exceptions/super-admin-email-conflict.exception.js';
import { UserEmailAlreadyUsedException } from '../../domain/exceptions/user-email-already-used.exception.js';
import { UserMapper } from './mappers/user.mapper.js';
export class TypeormUserRepository implements UserRepository {
  constructor(private readonly repo: Repository<UserEntity>) {}
  private read(row: UserEntity | null) {
    return row ? UserMapper.toDomain(row) : null;
  }
  async findById(id: string) {
    return this.read(await this.repo.findOneBy({ id }));
  }
  async findByEmail(email: string) {
    return this.read(
      await this.repo.findOneBy({ email: Email.create(email).value }),
    );
  }
  async findSuperAdmin() {
    return this.read(
      await this.repo.findOneBy({ globalRole: GlobalRole.SUPER_ADMIN }),
    );
  }
  async superAdminExists() {
    return (await this.findSuperAdmin()) !== null;
  }
  async createInitialSuperAdmin(input: {
    email: string;
    firstName?: string;
    lastName?: string;
  }) {
    try {
      return await this.repo.manager.transaction(
        'READ COMMITTED',
        async (manager) => {
          // One transaction-scoped lock across all bootstrap processes, independent of email.
          await manager.query(
            'SELECT pg_advisory_xact_lock($1, $2)',
            [17001, 1],
          );
          const repo = manager.getRepository(UserEntity);
          const existing = await repo.findOneBy({
            globalRole: GlobalRole.SUPER_ADMIN,
          });
          if (existing) return UserMapper.toDomain(existing);
          const candidate = User.createSuperAdmin(input);
          if (await repo.findOneBy({ email: candidate.email }))
            throw new SuperAdminEmailConflictException();
          return UserMapper.toDomain(
            await repo.save(UserMapper.toPersistence(candidate)),
          );
        },
      );
    } catch (error) {
      if (this.isUniqueConflict(error))
        throw new SuperAdminEmailConflictException();
      throw error;
    }
  }
  async save(user: User) {
    try {
      return UserMapper.toDomain(
        await this.repo.save(UserMapper.toPersistence(user)),
      );
    } catch (error) {
      if (this.isUniqueConflict(error))
        throw new UserEmailAlreadyUsedException();
      throw error;
    }
  }
  private isUniqueConflict(error: unknown): boolean {
    return (
      error instanceof QueryFailedError &&
      'code' in error.driverError &&
      error.driverError.code === '23505'
    );
  }
}
