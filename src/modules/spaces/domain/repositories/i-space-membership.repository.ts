import type { SpaceMembership } from '../entities/space-membership.js';
import type { SpaceMembershipRole } from '../enums/space-membership-role.js';
import type { SpaceMembershipStatus } from '../enums/space-membership-status.js';
import type { UUID } from 'node:crypto';

export const SPACE_MEMBERSHIP_REPOSITORY = Symbol('SPACE_MEMBERSHIP_REPOSITORY');

export interface SpaceMembershipRepository {
  findById(id: UUID): Promise<SpaceMembership | null>;
  findBySpaceAndUser(spaceId: UUID, userId: UUID): Promise<SpaceMembership | null>;
  findDirectManager(spaceId: UUID): Promise<SpaceMembership | null>;
  findMembers(
    spaceId: UUID,
    options?: { status?: SpaceMembershipStatus; role?: SpaceMembershipRole; designationKey?: string },
  ): Promise<SpaceMembership[]>;
  findManagerMembershipsForUser(userId: UUID): Promise<SpaceMembership[]>;
  findMembershipsByUser(userId: UUID): Promise<SpaceMembership[]>;
  findMembershipsBySpace(spaceId: UUID): Promise<SpaceMembership[]>;
  save(membership: SpaceMembership): Promise<SpaceMembership>;
  replaceManager(spaceId: UUID, newManagerMembership: SpaceMembership): Promise<void>;
  countActiveMembers(spaceId: UUID): Promise<number>;
}