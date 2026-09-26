import { Repository, QueryRunner, In, LessThan } from 'typeorm';
import { SpaceEntity } from './typeorm/space.entity.js';
import { Space } from '../../domain/entities/space.js';
import { SpaceKind } from '../../domain/enums/space-kind.js';
import type {
  SpaceRepository,
  SpaceFilters,
  PaginationParams,
  PaginatedResult,
} from '../../domain/repositories/i-space.repository.js';
import { SpaceMapper } from './mappers/space.mapper.js';
import { SpaceNotFoundException } from '../../domain/exceptions/space.exceptions.js';
import type { UUID } from 'node:crypto';

export class TypeormSpaceRepository implements SpaceRepository {
  constructor(private readonly repo: Repository<SpaceEntity>) {}

  async findById(id: UUID): Promise<Space | null> {
    const entity = await this.repo.findOneBy({ id });
    return entity ? SpaceMapper.toDomain(entity) : null;
  }

  async findByIdOrThrow(id: UUID): Promise<Space> {
    const space = await this.findById(id);
    if (!space) throw new SpaceNotFoundException(id);
    return space;
  }

  async findSchoolRoot(schoolId: UUID): Promise<Space | null> {
    const entity = await this.repo.findOneBy({ schoolId, kind: SpaceKind.SCHOOL_ROOT });
    return entity ? SpaceMapper.toDomain(entity) : null;
  }

  async findChildren(
    parentId: UUID,
    filters?: SpaceFilters,
    pagination?: PaginationParams,
  ): Promise<PaginatedResult<Space>> {
    const qb = this.repo.createQueryBuilder('space');
    qb.where('space.parentId = :parentId', { parentId });
    await this.applyFilters(qb, filters);

    if (pagination) {
      qb.skip((pagination.page - 1) * pagination.limit);
      qb.take(pagination.limit);
    }

    qb.orderBy('space.name', 'ASC');

    const [entities, total] = await qb.getManyAndCount();
    return {
      items: entities.map(SpaceMapper.toDomain),
      total,
      page: pagination?.page ?? 1,
      limit: pagination?.limit ?? 10,
      totalPages: pagination ? Math.ceil(total / pagination.limit) : 1,
    };
  }

  async findSubtree(rootId: UUID, maxDepth?: number): Promise<Space[]> {
    const root = await this.findByIdOrThrow(rootId);
    const rootPath = root.path.value;

    const qb = this.repo.createQueryBuilder('space');
    qb.where('space.path LIKE :path', { path: `${rootPath}/%` });
    qb.orWhere('space.id = :rootId', { rootId });

    if (maxDepth !== undefined) {
      qb.andWhere('space.depth <= :maxDepth', { maxDepth: root.depth + maxDepth });
    }

    qb.orderBy('space.path', 'ASC');

    const entities = await qb.getMany();
    return entities.map(SpaceMapper.toDomain);
  }

  async findPathToRoot(spaceId: UUID): Promise<Space[]> {
    const space = await this.findByIdOrThrow(spaceId);
    const pathParts = space.path.value.split('/').filter(Boolean);

    const qb = this.repo.createQueryBuilder('space');
    qb.where('space.id IN (:...ids)', { ids: pathParts });
    qb.orderBy('space.depth', 'ASC');

    const entities = await qb.getMany();
    return entities.map(SpaceMapper.toDomain);
  }

  async findSchoolTree(schoolId: UUID): Promise<Space[]> {
    const qb = this.repo.createQueryBuilder('space');
    qb.where('space.schoolId = :schoolId', { schoolId });
    qb.orderBy('space.path', 'ASC');

    const entities = await qb.getMany();
    return entities.map(SpaceMapper.toDomain);
  }

  async existsById(id: UUID): Promise<boolean> {
    const count = await this.repo.countBy({ id });
    return count > 0;
  }

  async hasChildren(spaceId: UUID): Promise<boolean> {
    const count = await this.repo.countBy({ parentId: spaceId });
    return count > 0;
  }

  async isAncestor(ancestorId: UUID, descendantId: UUID): Promise<boolean> {
    const ancestor = await this.findById(ancestorId);
    const descendant = await this.findById(descendantId);
    if (!ancestor || !descendant) return false;
    return descendant.path.isDescendantOf(ancestor.path);
  }

  async save(space: Space): Promise<Space> {
    const entity = SpaceMapper.toPersistence(space);
    const saved = await this.repo.save(entity);
    return SpaceMapper.toDomain(saved);
  }

  async updateSubtreePath(
    oldPrefix: string,
    newPrefix: string,
    depthDelta: number,
  ): Promise<number> {
    const qb = this.repo.createQueryBuilder('space');
    qb.update(SpaceEntity)
      .set({
        path: () => `REPLACE(path, :oldPrefix, :newPrefix)`,
        depth: () => `depth + :depthDelta`,
        updatedAt: () => `EXTRACT(EPOCH FROM NOW()) * 1000`,
        version: () => `version + 1`,
      })
      .where('path LIKE :oldPrefix', { oldPrefix: `${oldPrefix}%` })
      .setParameters({ oldPrefix, newPrefix, depthDelta });

    const result = await qb.execute();
    return result.affected ?? 0;
  }

  async countDescendants(spaceId: UUID): Promise<number> {
    const space = await this.findByIdOrThrow(spaceId);
    const path = space.path.value;
    return this.repo.countBy({ path: `${path}/%` });
  }

  private async applyFilters(qb: any, filters?: SpaceFilters): Promise<void> {
    if (!filters) return;
    if (filters.status) qb.andWhere('space.status = :status', { status: filters.status });
    if (filters.kind) qb.andWhere('space.kind = :kind', { kind: filters.kind });
    if (filters.memberId) {
      qb.innerJoin(
        'spaces.space_memberships',
        'membership',
        'membership.spaceId = space.id AND membership.userId = :memberId AND membership.status = :activeStatus',
        { memberId: filters.memberId, activeStatus: 'ACTIVE' },
      );
    }
    if (filters.memberRole) {
      qb.innerJoin(
        'spaces.space_memberships',
        'membership',
        'membership.spaceId = space.id AND membership.role = :role AND membership.status = :activeStatus',
        { role: filters.memberRole, activeStatus: 'ACTIVE' },
      );
    }
    if (filters.memberDesignationKey) {
      qb.andWhere('space.memberDesignationKey = :key', { key: filters.memberDesignationKey });
    }
    if (filters.hasManager) {
      qb.innerJoin(
        'spaces.space_memberships',
        'membership',
        'membership.spaceId = space.id AND membership.role = :managerRole AND membership.status = :activeStatus',
        { managerRole: 'MANAGER', activeStatus: 'ACTIVE' },
      );
    }
    if (filters.managerId) {
      qb.innerJoin(
        'spaces.space_memberships',
        'membership',
        'membership.spaceId = space.id AND membership.userId = :managerId AND membership.role = :managerRole AND membership.status = :activeStatus',
        { managerId: filters.managerId, managerRole: 'MANAGER', activeStatus: 'ACTIVE' },
      );
    }
    if (filters.manageableBy) {
      // This requires a subquery or application-level check
      // For now, we'll handle this in the application service
    }
    if (filters.ancestorId) {
      const ancestor = await this.findById(filters.ancestorId);
      if (ancestor) {
        qb.andWhere('space.path LIKE :prefix', { prefix: `${ancestor.path.value}/%` });
      }
    }
  }
}