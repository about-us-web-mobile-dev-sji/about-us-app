import { Repository } from 'typeorm';
import { SchoolMembershipEntity } from './typeorm/school-membership.entity.js';
import { SchoolMembership } from '../../domain/entities/school-membership.entity.js';
import type { SchoolMembershipRepository } from '../../domain/repositories/i-school-membership.repository.js';
import { SchoolMembershipMapper } from './mappers/school-membership.mapper.js';
import { MembershipStatus } from '../../domain/enums/membership-status.enum.js';
import { MembershipRole } from '../../domain/enums/membership-role.enum.js';

export class TypeormSchoolMembershipRepository
  implements SchoolMembershipRepository
{
  constructor(private readonly repo: Repository<SchoolMembershipEntity>) {}

  private read(entity: SchoolMembershipEntity | null): SchoolMembership | null {
    return entity ? SchoolMembershipMapper.toDomain(entity) : null;
  }

  async findById(id: string): Promise<SchoolMembership | null> {
    const entity = await this.repo.findOneBy({ id });
    return this.read(entity);
  }

  async findBySchoolAndUser(
    schoolId: string,
    userId: string,
  ): Promise<SchoolMembership | null> {
    const entity = await this.repo.findOneBy({ schoolId, userId });
    return this.read(entity);
  }

  async findActiveAdminBySchool(
    schoolId: string,
  ): Promise<SchoolMembership | null> {
    const entity = await this.repo.findOneBy({
      schoolId,
      role: MembershipRole.SCHOOL_ADMIN,
      status: MembershipStatus.ACTIVE,
    });
    return this.read(entity);
  }

  async findBySchool(schoolId: string): Promise<SchoolMembership[]> {
    const entities = await this.repo.findBy({ schoolId });
    return entities.map((e: SchoolMembershipEntity) => SchoolMembershipMapper.toDomain(e));
  }

  async save(membership: SchoolMembership): Promise<SchoolMembership> {
    const entity = SchoolMembershipMapper.toPersistence(membership);
    const saved = await this.repo.save(entity);
    return SchoolMembershipMapper.toDomain(saved);
  }
}
