import { MemberDesignation } from '../../domain/value-objects/member-designation.js';
import type { UUID } from 'node:crypto';

export interface UpdateMemberDesignationInput {
  spaceId: UUID;
  memberDesignation: MemberDesignation | null;
  actorId: UUID;
}

export interface UpdateMemberDesignationOutput {
  id: UUID;
  spaceId: UUID;
  memberDesignation: MemberDesignation | null;
  updatedAt: Date;
}

export interface GetEffectiveMemberDesignationInput {
  spaceId: UUID;
}

export interface GetEffectiveMemberDesignationOutput {
  spaceId: UUID;
  localDesignation: MemberDesignation | null;
  effectiveDesignation: MemberDesignation | null;
  inheritedFromSpaceId: UUID | null;
}

export interface GetSpacesByDesignationKeyInput {
  schoolId: UUID;
  designationKey: string;
  page?: number;
  limit?: number;
}

export interface GetSpacesByDesignationKeyOutput {
  items: GetSpacesByDesignationKeyOutputItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface GetSpacesByDesignationKeyOutputItem {
  id: UUID;
  schoolId: UUID;
  parentId: UUID | null;
  path: string;
  depth: number;
  name: string;
  memberDesignation: MemberDesignation | null;
}