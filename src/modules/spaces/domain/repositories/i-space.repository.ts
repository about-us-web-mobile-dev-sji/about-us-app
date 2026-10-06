import type { Space } from '../entities/space.js';
import type { SpaceKind } from '../enums/space-kind.js';
import type { SpaceStatus } from '../enums/space-status.js';
import type { UUID } from 'node:crypto';
import type { PaginatedResult, PaginationParams } from '../../../../shared/domain/pagination.js';

export interface SpaceFilters {
  schoolId?: UUID;
  parentId?: UUID;
  status?: SpaceStatus;
  kind?: SpaceKind;
  memberId?: UUID;
  memberRole?: string;
  memberDesignationKey?: string;
  hasManager?: boolean;
  managerId?: UUID;
  manageableBy?: UUID;
  ancestorId?: UUID;
}

export const SPACE_REPOSITORY = Symbol('SPACE_REPOSITORY');

export interface SpaceRepository {
  findById(id: UUID): Promise<Space | null>;
  findByIdOrThrow(id: UUID): Promise<Space>;
  findSchoolRoot(schoolId: UUID): Promise<Space | null>;
  findChildren(parentId: UUID, filters?: SpaceFilters, pagination?: PaginationParams): Promise<PaginatedResult<Space>>;
  findSubtree(rootId: UUID, maxDepth?: number): Promise<Space[]>;
  findPathToRoot(spaceId: UUID): Promise<Space[]>;
  findSchoolTree(schoolId: UUID): Promise<Space[]>;
  existsById(id: UUID): Promise<boolean>;
  hasChildren(spaceId: UUID): Promise<boolean>;
  isAncestor(ancestorId: UUID, descendantId: UUID): Promise<boolean>;
  save(space: Space): Promise<Space>;
  updateSubtreePath(oldPrefix: string, newPrefix: string, depthDelta: number): Promise<number>;
  countDescendants(spaceId: UUID): Promise<number>;
}