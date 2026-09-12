import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRepository } from '../../../domain/repositories/UserRepository.js';
import { User } from '../../../domain/entities/User.js';
import { Email } from '../../../../shared/domain/value-objects/Email.js';
import { UserPersistenceModel } from '../entities/UserPersistenceModel.js';
import { UserMapper } from '../mappers/UserMapper.js';

@Injectable()
export class TypeOrmUserRepository implements UserRepository {
  constructor(
    @InjectRepository(UserPersistenceModel)
    private readonly repository: Repository<UserPersistenceModel>,
  ) {}

  async save(user: User): Promise<User> {
    const model = UserMapper.toPersistence(user);
    const saved = await this.repository.save(model);
    return UserMapper.toDomain(saved);
  }

  async findById(id: string): Promise<User | null> {
    const model = await this.repository.findOne({ where: { id } });
    return model ? UserMapper.toDomain(model) : null;
  }

  async findByEmail(email: Email): Promise<User | null> {
    const model = await this.repository.findOne({
      where: { email: email.getValue() },
    });
    return model ? UserMapper.toDomain(model) : null;
  }

  async findAll(): Promise<User[]> {
    const models = await this.repository.find();
    return models.map((model) => UserMapper.toDomain(model));
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}
