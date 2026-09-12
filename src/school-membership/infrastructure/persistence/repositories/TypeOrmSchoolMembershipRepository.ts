import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SchoolMembershipRepository } from '../../../domain/repositories/SchoolMembershipRepository.js';
import { SchoolMembership } from '../../../domain/entities/SchoolMembership.js';
import { SchoolMembershipPersistenceModel } from '../entities/SchoolMembershipPersistenceModel.js';
import { SchoolMembershipMapper } from '../mappers/SchoolMembershipMapper.js';

@Injectable()
export class TypeOrmSchoolMembershipRepository implements SchoolMembershipRepository {
  constructor(
    @InjectRepository(SchoolMembershipPersistenceModel)
    private readonly repository: Repository<SchoolMembershipPersistenceModel>,
  ) {}

  async save(membership: SchoolMembership): Promise<SchoolMembership> {
    const model = SchoolMembershipMapper.toPersistence(membership);
    const saved = await this.repository.save(model);
    return SchoolMembershipMapper.toDomain(saved);
  }

  async findById(id: string): Promise<SchoolMembership | null> {
    const model = await this.repository.findOne({ where: { id } });
    return model ? SchoolMembershipMapper.toDomain(model) : null;
  }

  async findByUserIdAndSchoolId(userId: string, schoolId: string): Promise<SchoolMembership | null> {
    const model = await this.repository.findOne({
      where: { userId, schoolId },
    });
    return model ? SchoolMembershipMapper.toDomain(model) : null;
  }

  async findPrimaryAdministratorBySchoolId(schoolId: string): Promise<SchoolMembership | null> {
    const model = await this.repository.findOne({
      where: { schoolId, isPrimaryAdministrator: true },
    });
    return model ? SchoolMembershipMapper.toDomain(model) : null;
  }

  async findBySchoolId(schoolId: string): Promise<SchoolMembership[]> {
    const models = await this.repository.find({
      where: { schoolId },
      order: { createdAt: 'DESC' },
    });
    return models.map((model) => SchoolMembershipMapper.toDomain(model));
  }

  async findByUserId(userId: string): Promise<SchoolMembership[]> {
    const models = await this.repository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    return models.map((model) => SchoolMembershipMapper.toDomain(model));
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}
