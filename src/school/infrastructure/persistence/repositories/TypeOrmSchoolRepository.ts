import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SchoolRepository } from '../../../domain/repositories/SchoolRepository.js';
import { School } from '../../../domain/entities/School.js';
import { SchoolPersistenceModel } from '../entities/SchoolPersistenceModel.js';
import { SchoolMapper } from '../mappers/SchoolMapper.js';

@Injectable()
export class TypeOrmSchoolRepository implements SchoolRepository {
  constructor(
    @InjectRepository(SchoolPersistenceModel)
    private readonly repository: Repository<SchoolPersistenceModel>,
  ) {}

  async save(school: School): Promise<School> {
    const model = SchoolMapper.toPersistence(school);
    const saved = await this.repository.save(model);
    return SchoolMapper.toDomain(saved);
  }

  async findById(id: string): Promise<School | null> {
    const model = await this.repository.findOne({ where: { id } });
    return model ? SchoolMapper.toDomain(model) : null;
  }

  async findByIdentifier(identifier: string): Promise<School | null> {
    const model = await this.repository.findOne({ where: { identifier } });
    return model ? SchoolMapper.toDomain(model) : null;
  }

  async findAll(): Promise<School[]> {
    const models = await this.repository.find({
      order: { createdAt: 'DESC' },
    });
    return models.map((model) => SchoolMapper.toDomain(model));
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}
