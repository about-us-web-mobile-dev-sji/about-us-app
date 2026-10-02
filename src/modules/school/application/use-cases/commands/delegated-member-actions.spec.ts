import { describe, expect, it } from 'vitest';
import { GlobalRole } from '../../../../user/domain/enum/global-role.enum.js';
import { MembershipRole } from '../../../domain/enums/membership-role.enum.js';
import { MembershipStatus } from '../../../domain/enums/membership-status.enum.js';
import { SchoolAction } from '../../../domain/enums/school-action.enum.js';
import { SchoolMembershipActionForbiddenException } from '../../../domain/exceptions/school-membership-action-forbidden.exception.js';
import {
  SCHOOL_ID as schoolId,
  authorizationFor,
  inMemoryMemberships,
  membershipOf,
  schoolsRepo,
} from '../../testing/school-test-helpers.js';
import { SuspendSchoolMemberUseCase } from './suspend-school-member/suspend-school-member.js';
import { CancelSchoolMemberSuspensionUseCase } from './cancel-school-member-suspension/cancel-school-member-suspension.js';
import { RevokeSchoolMemberUseCase } from './revoke-school-member/revoke-school-member.js';

// Target protection for delegates (non super admin, non school admin).
describe('delegated suspend / cancel-suspension / revoke', () => {
  const roster = () => [
    membershipOf('admin-1', MembershipRole.SCHOOL_ADMIN),
    membershipOf('plain-1'),
    membershipOf('viewer-1', MembershipRole.SCHOOL_MEMBER, MembershipStatus.ACTIVE, [SchoolAction.VIEW_MEMBERS]),
    membershipOf('suspender-1', MembershipRole.SCHOOL_MEMBER, MembershipStatus.ACTIVE, [SchoolAction.SUSPEND_MEMBER]),
    membershipOf('revoker-1', MembershipRole.SCHOOL_MEMBER, MembershipStatus.ACTIVE, [SchoolAction.REVOKE_MEMBER]),
    membershipOf('canceller-1', MembershipRole.SCHOOL_MEMBER, MembershipStatus.ACTIVE, [SchoolAction.CANCEL_SUSPENSION]),
    membershipOf('sleeping-1', MembershipRole.SCHOOL_MEMBER, MembershipStatus.SUSPENDED),
    membershipOf('sleeping-suspender', MembershipRole.SCHOOL_MEMBER, MembershipStatus.SUSPENDED, [SchoolAction.SUSPEND_MEMBER]),
  ];

  const build = () => {
    const store = inMemoryMemberships(roster());
    const auth = authorizationFor(store.repo, schoolsRepo());
    return {
      store,
      suspend: new SuspendSchoolMemberUseCase(store.repo, auth),
      cancel: new CancelSchoolMemberSuspensionUseCase(store.repo, auth),
      revoke: new RevokeSchoolMemberUseCase(store.repo, auth),
    };
  };
  const by = (performedBy: string, memberUserId: string) => ({
    schoolId,
    memberUserId,
    performedBy,
    performedByGlobalRole: GlobalRole.USER,
  });
  const forbidden = SchoolMembershipActionForbiddenException;

  describe('suspend', () => {
    it('lets a SUSPEND_MEMBER delegate suspend a plain member or a harmless delegate', async () => {
      const { suspend, store } = build();
      await suspend.handle(by('suspender-1', 'plain-1'));
      await suspend.handle(by('suspender-1', 'viewer-1'));
      expect(store.get('plain-1').status).toBe(MembershipStatus.SUSPENDED);
      expect(store.get('viewer-1').status).toBe(MembershipStatus.SUSPENDED);
    });

    it.each([
      ['a school admin', 'admin-1'],
      ['themselves', 'suspender-1'],
      ['a peer holding SUSPEND_MEMBER', 'sleeping-suspender'],
    ])('refuses a delegate suspending %s', async (_label, target) => {
      const { suspend, store } = build();
      const before = store.get(target).status;
      await expect(suspend.handle(by('suspender-1', target))).rejects.toBeInstanceOf(forbidden);
      expect(store.get(target).status).toBe(before);
    });

    it('refuses a delegate suspending a peer holding REVOKE_MEMBER', async () => {
      const { suspend, store } = build();
      await expect(suspend.handle(by('suspender-1', 'revoker-1'))).rejects.toBeInstanceOf(forbidden);
      expect(store.get('revoker-1').status).toBe(MembershipStatus.ACTIVE);
    });

    it('still lets the school admin suspend a delegate that holds SUSPEND_MEMBER', async () => {
      const { suspend, store } = build();
      await suspend.handle(by('admin-1', 'suspender-1'));
      expect(store.get('suspender-1').status).toBe(MembershipStatus.SUSPENDED);
    });

    it('refuses a delegate whose own membership is suspended', async () => {
      const { suspend } = build();
      await expect(suspend.handle(by('sleeping-suspender', 'plain-1'))).rejects.toBeInstanceOf(forbidden);
    });
  });

  describe('cancel-suspension', () => {
    it('lets a CANCEL_SUSPENSION delegate reactivate a plain suspended member', async () => {
      const { cancel, store } = build();
      await cancel.handle(by('canceller-1', 'sleeping-1'));
      expect(store.get('sleeping-1').status).toBe(MembershipStatus.ACTIVE);
    });

    it('refuses reactivating a suspended peer who holds SUSPEND_MEMBER', async () => {
      const { cancel, store } = build();
      await expect(cancel.handle(by('canceller-1', 'sleeping-suspender'))).rejects.toBeInstanceOf(forbidden);
      expect(store.get('sleeping-suspender').status).toBe(MembershipStatus.SUSPENDED);
    });

    it('lets the school admin reactivate that same peer', async () => {
      const { cancel, store } = build();
      await cancel.handle(by('admin-1', 'sleeping-suspender'));
      expect(store.get('sleeping-suspender').status).toBe(MembershipStatus.ACTIVE);
    });
  });

  describe('revoke', () => {
    it('lets a REVOKE_MEMBER delegate revoke a plain member', async () => {
      const { revoke, store } = build();
      await revoke.handle(by('revoker-1', 'plain-1'));
      expect(store.get('plain-1').status).toBe(MembershipStatus.REVOKED);
    });

    it.each([
      ['a school admin', 'admin-1'],
      ['themselves', 'revoker-1'],
      ['a peer holding SUSPEND_MEMBER', 'suspender-1'],
    ])('refuses a delegate revoking %s', async (_label, target) => {
      const { revoke, store } = build();
      const before = store.get(target).status;
      await expect(revoke.handle(by('revoker-1', target))).rejects.toBeInstanceOf(forbidden);
      expect(store.get(target).status).toBe(before);
    });
  });
});
