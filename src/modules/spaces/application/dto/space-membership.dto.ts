import { SpaceMembershipRole } from '../../domain/enums/space-membership-role.js';
import { SpaceMembershipStatus } from '../../domain/enums/space-membership-status.js';
import type { UUID } from 'node:crypto';

export interface AddMemberInput {
  spaceId: UUID;
  userId: UUID;
  role: SpaceMembershipRole;
  actorId: UUID;
}

export interface AddMemberOutput {
  id: UUID;
  spaceId: UUID;
  userId: UUID;
  role: SpaceMembershipRole;
  status: SpaceMembershipStatus;
  grantedBy: UUID | null;
  grantedAt: Date;
  revokedAt: Date | null;
  revokedBy: UUID | null;
}

export interface RemoveMemberInput {
  spaceId: UUID;
  userId: UUID;
  actorId: UUID;
}

export interface RemoveMemberOutput {
  id: UUID;
  spaceId: UUID;
  userId: UUID;
  status: SpaceMembershipStatus;
  revokedAt: Date;
  revokedBy: UUID;
}

export interface AssignManagerInput {
  spaceId: UUID;
  userId: UUID;
  actorId: UUID;
}

export interface AssignManagerOutput {
  id: UUID;
  spaceId: UUID;
  userId: UUID;
  role: SpaceMembershipRole;
  status: SpaceMembershipStatus;
  grantedBy: UUID | null;
  grantedAt: Date;
}

export interface RemoveManagerInput {
  spaceId: UUID;
  actorId: UUID;
}

export interface RemoveManagerOutput {
  id: UUID;
  spaceId: UUID;
  userId: UUID;
  status: SpaceMembershipStatus;
  revokedAt: Date;
  revokedBy: UUID;
}

export interface GetMembersInput {
  spaceId: UUID;
  status?: SpaceMembershipStatus;
  role?: SpaceMembershipRole;
  designationKey?: string;
  page?: number;
  limit?: number;
}

export interface GetMembersOutput {
  items: GetMembersOutputItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface GetMembersOutputItem {
  id: UUID;
  spaceId: UUID;
  userId: UUID;
  role: SpaceMembershipRole;
  status: SpaceMembershipStatus;
  grantedBy: UUID | null;
  grantedAt: Date;
  revokedAt: Date | null;
  revokedBy: UUID | null;
}

export interface GetEffectiveManagersInput {
  spaceId: UUID;
}

export interface GetEffectiveManagersOutput {
  spaceId: UUID;
  directManager: GetMembersOutputItem | null;
  inheritedManagers: GetMembersOutputItem[];
}