import { User } from '../../../domain/entities/User.js';
import { UserPersistenceModel } from '../entities/UserPersistenceModel.js';
import { Email } from '../../../../shared/domain/value-objects/Email.js';

export class UserMapper {
  static toDomain(model: UserPersistenceModel): User {
    return new User(
      model.id,
      Email.create(model.email),
      model.firstName,
      model.lastName,
      model.passwordHash,
      model.roles,
      model.createdAt,
      model.updatedAt,
    );
  }

  static toPersistence(user: User): UserPersistenceModel {
    const model = new UserPersistenceModel();
    model.id = user.getId();
    model.email = user.getEmail().getValue();
    model.firstName = user.getFirstName();
    model.lastName = user.getLastName();
    model.passwordHash = user.getPasswordHash();
    model.roles = user.getRoles();
    model.createdAt = user.getCreatedAt();
    model.updatedAt = user.getUpdatedAt();
    return model;
  }
}
