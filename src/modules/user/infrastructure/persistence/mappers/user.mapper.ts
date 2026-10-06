import { randomUUID } from 'node:crypto';
import { User } from '../../../domain/entities/user.entity.js';
import { UserId } from '../../../domain/value-objects/user-id.js';
import { UserEntity } from '../entity/user.entity.js';
export class UserMapper {
  static toDomain(row: UserEntity): User {
    return User.reconstitute({
      id: UserId.create(row.id).value,
      email: row.email,
      firstName: row.firstName,
      lastName: row.lastName,
      status: row.status,
      globalRole: row.globalRole,
    });
  }
  static toPersistence(user: User): UserEntity {
    return Object.assign(new UserEntity(), {
      id: user.id ?? randomUUID(),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      status: user.status,
      globalRole: user.globalRole,
    });
  }
}
