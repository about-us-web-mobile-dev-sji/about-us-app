import { randomUUID } from 'node:crypto';
import { User } from '../../../domain/entities/user.enity.js';
import type { UserRepository } from '../../../domain/repositories/i-user.repository.js';
import type { PUser } from '../entity/p-user.entity.js';
import { ConfigService } from '@nestjs/config';
import UserStatus from '../../../domain/enum/user-status.enum.js';

export class PUserRepository implements UserRepository {
  private readonly bd: PUser[] = [
    {
      id: '11111111-1111-4111-8111-111111111111',
      firstName: 'Alice',
      lastName: 'Martin',
      email: 'alice@example.com',
      status: UserStatus.ACTIVE,
    },
    {
      id: '22222222-2222-4222-8222-222222222222',
      firstName: 'Paul',
      lastName: 'Dubois',
      email: 'paul@example.com',
      status: UserStatus.ACTIVE,
    },
    {
      id: '33333333-3333-4333-8333-333333333333',
      firstName: 'Marie',
      lastName: 'Bernard',
      email: 'marie@example.com',
      status: UserStatus.SUSPENDED,
    },
  ];

  constructor(private readonly configService: ConfigService) {}

  async superAdminExists(): Promise<boolean> {
    return this.bd.some(
      (user) => user.email === this.configService.get('super-admin').email,
    );
  }

  async save(user: User): Promise<User> {
    const props = {
      id: user.id ?? randomUUID(),
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
}
