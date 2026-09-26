import { SpaceKind } from '../../domain/enums/space-kind.js';
import { SpaceStatus } from '../../domain/enums/space-status.js';
import { MemberDesignation } from '../../domain/value-objects/member-designation.js';
import type { UUID } from 'node:crypto';

export interface CreateSpaceInput {
  parentId: UUID;
  name: string;
  description?: string | null;
  memberDesignation?: MemberDesignation | null;
  actorId: UUID;
}

export interface CreateSpaceOutput {
  id: UUID;
  schoolId: UUID;
  parentId: UUID;
  path: string;
  depth: number;
  kind: SpaceKind;
  name: string;
  description: string | null;
  memberDesignation: MemberDesignation | null;
  status: SpaceStatus;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
  deletedAt: Date | null;
}

export interface InsertParentInput {
  childId: UUID;
  name: string;
  description?: string | null;
  memberDesignation?: MemberDesignation | null;
  actorId: UUID;
}

export interface InsertParentOutput {
  newSpace: CreateSpaceOutput;
  updatedChild: {
    id: UUID;
    parentId: UUID;
    path: string;
    depth: number;
  };
  updatedDescendantsCount: number;
}

export interface MoveSpaceInput {
  spaceId: UUID;
  newParentId: UUID;
  actorId: UUID;
}

export interface MoveSpaceOutput {
  spaceId: UUID;
  oldParentId: UUID | null;
  newParentId: UUID;
  oldPath: string;
  newPath: string;
  depthDelta: number;
  updatedDescendantsCount: number;
}

export interface ArchiveSpaceInput {
  spaceId: UUID;
  actorId: UUID;
}

export interface ArchiveSpaceOutput {
  id: UUID;
  status: SpaceStatus;
  archivedAt: Date;
  updatedAt: Date;
}

export interface RestoreSpaceInput {
  spaceId: UUID;
  actorId: UUID;
}

export interface RestoreSpaceOutput {
  id: UUID;
  status: SpaceStatus;
  archivedAt: Date | null;
  updatedAt: Date;
}

export interface DeleteSpaceInput {
  spaceId: UUID;
  actorId: UUID;
  recursive?: boolean;
}

export interface DeleteSpaceOutput {
  id: UUID;
  deletedAt: Date;
  status: SpaceStatus;
  recursive: boolean;
  deletedDescendantsCount?: number;
}

export interface GetSpaceOutput {
  id: UUID;
  schoolId: UUID;
  parentId: UUID | null;
  path: string;
  depth: number;
  kind: SpaceKind;
  name: string;
  description: string | null;
  memberDesignation: MemberDesignation | null;
  status: SpaceStatus;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
  deletedAt: Date | null;
}

export interface GetChildrenInput {
  parentId: UUID;
  page?: number;
  limit?: number;
  status?: SpaceStatus;
  kind?: SpaceKind;
}

export interface GetChildrenOutput {
  items: GetSpaceOutput[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface GetSubtreeInput {
  rootId: UUID;
  maxDepth?: number;
}

export interface GetSubtreeOutput {
  items: GetSpaceOutput[];
  rootId: UUID;
  maxDepth: number | null;
}

export interface GetPathToRootOutput {
  items: GetSpaceOutput[];
}

export interface GetSchoolTreeOutput {
  items: GetSpaceOutput[];
  schoolId: UUID;
}