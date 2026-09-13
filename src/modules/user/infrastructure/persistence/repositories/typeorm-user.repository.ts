import { Repository, QueryFailedError } from 'typeorm';
import { UserEntity } from './../entity/user.entity.js';
import { User } from '../../../domain/entities/user.entity.js';
import { GlobalRole } from '../../../domain/enum/global-role.enum.js';
import { Email } from '../../../domain/value-objects/email.js';
import type {
  PaginatedResult,
  PaginationParams,
  UserFilters,
  UserRepository,
} from '../../../domain/repositories/i-user.repository.js';
import { SuperAdminEmailConflictException } from '../../../domain/exceptions/super-admin-email-conflict.exception.js';
import { UserEmailAlreadyUsedException } from '../../../domain/exceptions/user-email-already-used.exception.js';
import { UserMapper } from './../mappers/user.mapper.js';
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

  async getAll(
    filters: UserFilters,
    pagination: PaginationParams,
  ): Promise<PaginatedResult<User>> {
    const query = this.repo.createQueryBuilder('user');

    if (filters.status) query.andWhere('user.status = :status', { status: filters.status });
    if (filters.search) {
      query.andWhere(
        '(LOWER(user.firstName) LIKE :search OR LOWER(user.lastName) LIKE :search OR LOWER(user.email) LIKE :search)',
        { search: `%${filters.search.toLowerCase()}%` },
      );
    }
    query.andWhere('user.globalRole != :superAdmin', { superAdmin: GlobalRole.SUPER_ADMIN });

    const [rows, total] = await query
      .skip((pagination.page - 1) * pagination.limit)
      .take(pagination.limit)
      .getManyAndCount();

    return {
      items: rows.map((row) => UserMapper.toDomain(row)),
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil(total / pagination.limit),
    };
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
      if (this.isEmailConflict(error))
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
      if (this.isEmailConflict(error))
        throw new UserEmailAlreadyUsedException();
      throw error;
    }
  }
  private isEmailConflict(error: unknown): boolean {
    return (
      error instanceof QueryFailedError &&
      'code' in error.driverError &&
      error.driverError.code === '23505' &&
      this.repo.metadata.uniques.some((constraint) =>
        constraint.name === error.driverError.constraint &&
        constraint.columns.length === 1 &&
        constraint.columns[0].propertyName === 'email'
      )
    );
  }
}
