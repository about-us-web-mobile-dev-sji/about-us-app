import { Repository, QueryFailedError } from 'typeorm';
import { SchoolEntity } from './typeorm/school.entity.js';
import { School } from '../../domain/entities/school.entity.js';
import type { SchoolRepository } from '../../domain/repositories/i-school.repository.js';
import { SchoolMapper } from './mappers/school.mapper.js';
import { SchoolNameAlreadyExistsException } from '../../domain/exceptions/school-name-already-exists.exception.js';

export class TypeormSchoolRepository implements SchoolRepository {
  constructor(private readonly repo: Repository<SchoolEntity>) {}

  private read(entity: SchoolEntity | null): School | null {
    return entity ? SchoolMapper.toDomain(entity) : null;
  }

  async findById(id: string): Promise<School | null> {
    const entity = await this.repo.findOneBy({ id });
    return this.read(entity);
  }

  async findByName(name: string): Promise<School | null> {
    const entity = await this.repo.findOneBy({ name: name.trim() });
    return this.read(entity);
  }

  async existsByName(name: string): Promise<boolean> {
    const count = await this.repo.countBy({ name: name.trim() });
    return count > 0;
  }

  async save(school: School): Promise<School> {
    try {
      const entity = SchoolMapper.toPersistence(school);
      const saved = await this.repo.save(entity);
      return SchoolMapper.toDomain(saved);
    } catch (error) {
      if (this.isUniqueConstraintViolation(error)) {
        throw new SchoolNameAlreadyExistsException();
      }
      throw error;
    }
  }

  async findAll(): Promise<School[]> {
    const entities = await this.repo.find();
    return entities.map((entity) => SchoolMapper.toDomain(entity));
  }

  private isUniqueConstraintViolation(error: unknown): boolean {
    return (
      error instanceof QueryFailedError &&
      ('code' in error && error.code === '23505')
    );
  }
}
