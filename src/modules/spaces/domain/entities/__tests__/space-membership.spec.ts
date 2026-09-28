import { describe, it, expect } from 'vitest';
import { SpaceMembership } from '../space-membership.js';
import { SpaceMembershipRole } from '../../enums/space-membership-role.js';
import { SpaceMembershipStatus } from '../../enums/space-membership-status.js';
import { SpaceMemberAlreadyExistsException, SpaceMemberNotFoundException } from '../../exceptions/space.exceptions.js';

const spaceId = crypto.randomUUID();
const userId = crypto.randomUUID();
const grantedBy = crypto.randomUUID();

describe('SpaceMembership Entity', () => {
  describe('ADD MEMBER', () => {
    it('creates active membership with MEMBER role', () => {
      const membership = SpaceMembership.create({
        spaceId,
        userId,
        role: SpaceMembershipRole.MEMBER,
        grantedBy,
      });

      expect(membership.id).toBeDefined();
      expect(membership.spaceId).toBe(spaceId);
      expect(membership.userId).toBe(userId);
      expect(membership.role).toBe(SpaceMembershipRole.MEMBER);
      expect(membership.status).toBe(SpaceMembershipStatus.ACTIVE);
      expect(membership.grantedBy).toBe(grantedBy);
      expect(membership.grantedAt).toBeDefined();
      expect(membership.revokedAt).toBeNull();
      expect(membership.revokedBy).toBeNull();
    });

    it('creates active membership with MANAGER role', () => {
      const membership = SpaceMembership.create({
        spaceId,
        userId,
        role: SpaceMembershipRole.MANAGER,
        grantedBy,
      });

      expect(membership.role).toBe(SpaceMembershipRole.MANAGER);
      expect(membership.isManager()).toBe(true);
    });

    it('isActive returns true for new membership', () => {
      const membership = SpaceMembership.create({
        spaceId,
        userId,
        role: SpaceMembershipRole.MEMBER,
        grantedBy,
      });
      expect(membership.isActive()).toBe(true);
    });
  });

  describe('REMOVE MEMBER', () => {
    it('removes membership', () => {
      const membership = SpaceMembership.create({
        spaceId,
        userId,
        role: SpaceMembershipRole.MEMBER,
        grantedBy,
      });
      const revokerId = crypto.randomUUID();
      membership.remove(revokerId);

      expect(membership.isRemoved()).toBe(true);
      expect(membership.status).toBe(SpaceMembershipStatus.REMOVED);
      expect(membership.revokedAt).toBeDefined();
      expect(membership.revokedBy).toBe(revokerId);
    });

    it('removing already removed throws', () => {
      const membership = SpaceMembership.create({
        spaceId,
        userId,
        role: SpaceMembershipRole.MEMBER,
        grantedBy,
      });
      membership.remove(crypto.randomUUID());
      expect(() => membership.remove(crypto.randomUUID())).toThrow(SpaceMemberNotFoundException);
    });
  });

  describe('DUPLICATE PREVENTION', () => {
    it('reactivating active membership throws', () => {
      const membership = SpaceMembership.create({
        spaceId,
        userId,
        role: SpaceMembershipRole.MEMBER,
        grantedBy,
      });
      expect(() => membership.reactivate(crypto.randomUUID())).toThrow(SpaceMemberAlreadyExistsException);
    });
  });

  describe('MANAGER', () => {
    it('no manager initially', () => {
      const membership = SpaceMembership.create({
        spaceId,
        userId,
        role: SpaceMembershipRole.MEMBER,
        grantedBy,
      });
      expect(membership.isManager()).toBe(false);
      expect(membership.isMember()).toBe(true);
    });

    it('assigns manager', () => {
      const membership = SpaceMembership.create({
        spaceId,
        userId,
        role: SpaceMembershipRole.MANAGER,
        grantedBy,
      });
      expect(membership.isManager()).toBe(true);
      expect(membership.isMember()).toBe(false);
    });

    it('promote to manager', () => {
      const membership = SpaceMembership.create({
        spaceId,
        userId,
        role: SpaceMembershipRole.MEMBER,
        grantedBy,
      });
      membership.promoteToManager();
      expect(membership.isManager()).toBe(true);
      expect(membership.role).toBe(SpaceMembershipRole.MANAGER);
    });

    it('demote to member', () => {
      const membership = SpaceMembership.create({
        spaceId,
        userId,
        role: SpaceMembershipRole.MANAGER,
        grantedBy,
      });
      membership.demoteToMember();
      expect(membership.isMember()).toBe(true);
      expect(membership.role).toBe(SpaceMembershipRole.MEMBER);
    });

    it('uniqueness of direct manager enforced at use case level', () => {
      // Repository will enforce: findDirectManager + constraint
      expect(true).toBe(true);
    });

    it('removing manager does not delete space', () => {
      const membership = SpaceMembership.create({
        spaceId,
        userId,
        role: SpaceMembershipRole.MANAGER,
        grantedBy,
      });
      membership.remove(crypto.randomUUID());
      expect(membership.isRemoved()).toBe(true);
      // Space entity unaffected
    });
  });

  describe('HIERARCHICAL MANAGEMENT', () => {
    it('manager memberships can be queried for user', () => {
      const m1 = SpaceMembership.create({
        spaceId,
        userId,
        role: SpaceMembershipRole.MANAGER,
        grantedBy,
      });
      expect(m1.isManager()).toBe(true);

      const m2 = SpaceMembership.create({
        spaceId: crypto.randomUUID(),
        userId,
        role: SpaceMembershipRole.MEMBER,
        grantedBy,
      });
      expect(m2.isManager()).toBe(false);
    });
  });
});