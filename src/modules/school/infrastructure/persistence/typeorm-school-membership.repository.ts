import { In, Repository } from 'typeorm';
import { SchoolMembershipEntity } from './typeorm/school-membership.entity.js';
import { SchoolMembership } from '../../domain/entities/school-membership.entity.js';
import type { SchoolMembershipRepository } from '../../domain/repositories/i-school-membership.repository.js';
import { SchoolMembershipMapper } from './mappers/school-membership.mapper.js';
import { MembershipStatus } from '../../domain/enums/membership-status.enum.js';
import { SchoolRoleKey } from '../../domain/enums/school-role-key.enum.js';
import { UserEntity } from '../../../user/infrastructure/persistence/entity/user.entity.js';
import type { PaginationParams, PaginatedResult } from '../../../../shared/domain/pagination.js';
import type { SchoolMembershipFilters } from '../../domain/repositories/i-school-membership.repository.js';

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

  async findBySchool(schoolId: string): Promise<SchoolMembership[]> {
    const entities = await this.repo.findBy({ schoolId });
    return entities.map((e: SchoolMembershipEntity) => SchoolMembershipMapper.toDomain(e));
  }

  async findBySchoolPaginated(
    schoolId: string,
    filters: SchoolMembershipFilters,
    pagination: PaginationParams,
  ): Promise<PaginatedResult<SchoolMembership>> {
    const base = this.repo
      .createQueryBuilder('membership')
      .where('membership.schoolId = :schoolId', { schoolId })
      .andWhere('membership.status IN (:...statuses)', {
        statuses: [...filters.statuses],
      });

    if (filters.roleId) {
      base.innerJoin(
        'membership.roles',
        'filteredRole',
        'filteredRole.id = :roleId',
        { roleId: filters.roleId },
      );
    }
    if (filters.search) {
      const search = `%${filters.search.trim().toLowerCase()}%`;
      base
        // users.id is text while school_memberships.user_id is uuid.
        .innerJoin(UserEntity, 'memberUser', 'memberUser.id = CAST(membership.userId AS text)')
        .andWhere(
          `(
            LOWER(COALESCE(memberUser.firstName, '')) LIKE :memberSearch
            OR LOWER(COALESCE(memberUser.lastName, '')) LIKE :memberSearch
            OR LOWER(CONCAT_WS(' ', memberUser.firstName, memberUser.lastName)) LIKE :memberSearch
            ${filters.includeEmailInSearch ? 'OR LOWER(memberUser.email) LIKE :memberSearch' : ''}
          )`,
          { memberSearch: search },
        );
    }

    const total = await base.clone().getCount();

    const rows = await base
      .clone()
      .select('membership.id', 'id')
      .addSelect(
        `CASE WHEN EXISTS (
          SELECT 1
          FROM school.school_membership_roles link
          INNER JOIN school.school_roles admin_role ON admin_role.id = link.school_role_id
          WHERE link.membership_id = "membership"."id"
            AND admin_role.key = :adminRoleKey
        ) THEN 0 ELSE 1 END`,
        'admin_rank',
      )
      .addSelect('membership.grantedAt', 'granted_at')
      .setParameter('adminRoleKey', SchoolRoleKey.SCHOOL_ADMIN)
      .orderBy('admin_rank', 'ASC')
      .addOrderBy('granted_at', 'ASC')
      .addOrderBy('membership.id', 'ASC')
      .offset((pagination.page - 1) * pagination.limit)
      .limit(pagination.limit)
      .getRawMany<{ id: string }>();

    const ids = rows.map((row) => row.id);
    const entities = ids.length > 0 ? await this.repo.find({ where: { id: In(ids) } }) : [];
    const byId = new Map(entities.map((entity) => [entity.id, entity]));

    return {
      items: ids
        .map((id) => byId.get(id))
        .filter((entity): entity is SchoolMembershipEntity => !!entity)
        .map((entity) => SchoolMembershipMapper.toDomain(entity)),
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil(total / pagination.limit),
    };
  }

  async findActiveByUser(userId: string): Promise<SchoolMembership[]> {
    const entities = await this.repo.findBy({
      userId,
      status: MembershipStatus.ACTIVE,
    });
    return entities.map((e: SchoolMembershipEntity) => SchoolMembershipMapper.toDomain(e));
  }

  async findByRole(roleId: string): Promise<SchoolMembership[]> {
    const entities = await this.repo
      .createQueryBuilder('membership')
      .innerJoin('membership.roles', 'role', 'role.id = :roleId', { roleId })
      .getMany();
    return entities.map((entity) => SchoolMembershipMapper.toDomain(entity));
  }

  async save(membership: SchoolMembership): Promise<SchoolMembership> {
    const entity = SchoolMembershipMapper.toPersistence(membership);
    const saved = await this.repo.save(entity);
    return SchoolMembershipMapper.toDomain(saved);
  }
}
