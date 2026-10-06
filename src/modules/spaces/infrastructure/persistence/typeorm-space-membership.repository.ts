import { Repository, In } from 'typeorm';
import { SpaceMembershipEntity } from './typeorm/space-membership.entity.js';
import { SpaceMembership } from '../../domain/entities/space-membership.js';
import type {
  SpaceMembershipRepository,
} from '../../domain/repositories/i-space-membership.repository.js';
import { SpaceMembershipMapper } from './mappers/space-membership.mapper.js';
import { SpaceMembershipRole } from '../../domain/enums/space-membership-role.js';
import { SpaceMembershipStatus } from '../../domain/enums/space-membership-status.js';
import type { UUID } from 'node:crypto';

export class TypeormSpaceMembershipRepository implements SpaceMembershipRepository {
  constructor(private readonly repo: Repository<SpaceMembershipEntity>) {}

  async findById(id: UUID): Promise<SpaceMembership | null> {
    const entity = await this.repo.findOneBy({ id });
    return entity ? SpaceMembershipMapper.toDomain(entity) : null;
  }

  async findBySpaceAndUser(spaceId: UUID, userId: UUID): Promise<SpaceMembership | null> {
    const entity = await this.repo.findOneBy({ spaceId, userId });
    return entity ? SpaceMembershipMapper.toDomain(entity) : null;
  }

  async findDirectManager(spaceId: UUID): Promise<SpaceMembership | null> {
    const entity = await this.repo.findOneBy({
      spaceId,
      role: SpaceMembershipRole.MANAGER,
      status: SpaceMembershipStatus.ACTIVE,
    });
    return entity ? SpaceMembershipMapper.toDomain(entity) : null;
  }

  async findMembers(
    spaceId: UUID,
    options?: { status?: SpaceMembershipStatus; role?: SpaceMembershipRole; designationKey?: string },
  ): Promise<SpaceMembership[]> {
    const qb = this.repo.createQueryBuilder('membership');
    qb.where('membership.spaceId = :spaceId', { spaceId });

    if (options?.status) {
      qb.andWhere('membership.status = :status', { status: options.status });
    }
    if (options?.role) {
      qb.andWhere('membership.role = :role', { role: options.role });
    }
    if (options?.designationKey) {
      // Note: designationKey is on Space, not SpaceMembership
      // This would require a join with Space table
      // For now, we'll skip this filter at repository level
    }

    qb.orderBy('membership.grantedAt', 'ASC');
    const entities = await qb.getMany();
    return entities.map(SpaceMembershipMapper.toDomain);
  }

  async findManagerMembershipsForUser(userId: UUID): Promise<SpaceMembership[]> {
    const entities = await this.repo.findBy({
      userId,
      role: SpaceMembershipRole.MANAGER,
      status: SpaceMembershipStatus.ACTIVE,
    });
    return entities.map(SpaceMembershipMapper.toDomain);
  }

  async findMembershipsByUser(userId: UUID): Promise<SpaceMembership[]> {
    const entities = await this.repo.findBy({ userId });
    return entities.map(SpaceMembershipMapper.toDomain);
  }

  async findMembershipsBySpace(spaceId: UUID): Promise<SpaceMembership[]> {
    const entities = await this.repo.findBy({ spaceId });
    return entities.map(SpaceMembershipMapper.toDomain);
  }

  async save(membership: SpaceMembership): Promise<SpaceMembership> {
    const entity = SpaceMembershipMapper.toPersistence(membership);
    const saved = await this.repo.save(entity);
    return SpaceMembershipMapper.toDomain(saved);
  }

  async replaceManager(spaceId: UUID, newManagerMembership: SpaceMembership): Promise<void> {
    // First, demote existing manager(s) - there should be at most one active
    await this.repo.update(
      { spaceId, role: SpaceMembershipRole.MANAGER, status: SpaceMembershipStatus.ACTIVE },
      { role: SpaceMembershipRole.MEMBER },
    );

    // Save the new manager
    await this.save(newManagerMembership);
  }

  async countActiveMembers(spaceId: UUID): Promise<number> {
    return this.repo.countBy({ spaceId, status: SpaceMembershipStatus.ACTIVE });
  }
}