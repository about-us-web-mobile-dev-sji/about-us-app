import { randomUUID } from 'node:crypto';
import { User } from '../../../domain/entities/user.enity.js';
import type { PaginatedResult, PaginationParams, UserFilters, UserRepository } from '../../../domain/repositories/i-user.repository.js';
import type { PUser } from '../entity/p-user.entity.js';
import { ConfigService } from '@nestjs/config';
import UserStatus from '../../../domain/enum/user-status.enum.js';
import { UserPersistenceMapper } from '../mappers/user.persistence.mapper.js';

export class PUserRepository implements UserRepository {
  private readonly bd: PUser[] = [
    {
      id: '11111111-1111-4111-8111-111111111111',
      schoolId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      firstName: 'Alice',
      lastName: 'Martin',
      email: 'alice@example.com',
      status: UserStatus.ACTIVE,
    },
    {
      id: '22222222-2222-4222-8222-222222222222',
      schoolId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      firstName: 'Paul',
      lastName: 'Dubois',
      email: 'paul@example.com',
      status: UserStatus.ACTIVE,
    },
    {
      id: '33333333-3333-4333-8333-333333333333',
      schoolId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      firstName: 'Marie',
      lastName: 'Bernard',
      email: 'marie@example.com',
      status: UserStatus.SUSPENDED,
    },
  ];

  constructor(private readonly configService: ConfigService,
    private readonly userPersistenceMapper: UserPersistenceMapper
  ) {}

  async superAdminExists(): Promise<boolean> {
    return this.bd.some(
      (user) => user.email === this.configService.get('super-admin').email,
    );
  }

  async save(user: User): Promise<User> {
    const props = {
      id: user.id ?? randomUUID(),
      schoolId: user.schoolId,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      status: user.status,
    };
    const persistedUser: PUser = { ...props };
    const index = this.bd.findIndex((entry) => entry.id === props.id);

    if (index === -1) {
      this.bd.push(persistedUser);
    } else {
      this.bd[index] = persistedUser;
    }

    // Domain changes require an explicit save to update the stored copy.
    return User.reconstitute({ ...props });
  }

  async getAll(filters: UserFilters, pagination: PaginationParams): Promise<PaginatedResult<User>> {

    let filteredUsers = this.bd.filter((user) => {
      if (filters.status && user.status !== filters.status) {
        return false;
      }
      if (filters.schoolId && user.schoolId !== filters.schoolId) {
        return false;
      }
      if (filters.search) {
        const search = filters.search.toLowerCase();
        const matchesSearch =
          user.firstName?.toLowerCase().includes(search) ||
          user.lastName?.toLowerCase().includes(search) ||
          user.email.toLowerCase().includes(search);
        if (!matchesSearch) {
          return false;
        }
      }
      return true;
    });

    const total = filteredUsers.length;

    const start = (pagination.page - 1) * pagination.limit;
    const end = start + pagination.limit;
    const paginatedUsers = filteredUsers.slice(start, end);

    return {
      items: paginatedUsers.map((user) =>
        this.userPersistenceMapper.toDomain({
          id: user.id,
          schoolId: user.schoolId,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          status: user.status,
        })
      ),
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil(total / pagination.limit),
    };
  }

  async findById(id: string): Promise<User | null> {
    const pUser = this.bd.find((user) => user.id === id);
    if (!pUser) {
      return null;
    }
    return this.userPersistenceMapper.toDomain(pUser);
  }
}
