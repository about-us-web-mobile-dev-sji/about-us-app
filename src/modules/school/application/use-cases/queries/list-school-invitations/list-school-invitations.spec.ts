import { describe, expect, it } from 'vitest';
import { ListSchoolInvitationsUseCase } from './list-school-invitations.js';
import { InvitationStatus } from '../../../../domain/enums/invitation-status.enum.js';
import { SchoolRole } from '../../../../domain/enums/school-role.enum.js';
import { InvalidSchoolMembershipException } from '../../../../domain/exceptions/invalid-school-membership.exception.js';
import { SchoolMembershipActionForbiddenException } from '../../../../domain/exceptions/school-membership-action-forbidden.exception.js';
import type { TrackedInvitationStatus } from '../../../../domain/repositories/i-school-invitation.repository.js';
import {
  SCHOOL_ID,
  inMemoryInvitations,
  membershipOf,
  pendingInvitation,
  world,
} from '../../../testing/school-test-helpers.js';

describe('ListSchoolInvitationsUseCase', () => {
  const future = new Date(Date.now() + 86_400_000);
  const past = new Date(Date.now() - 86_400_000);

  const setup = () => {
    const w = world([membershipOf('admin', SchoolRole.ADMIN), membershipOf('staff', SchoolRole.MEMBER)]);
    const invitations = inMemoryInvitations([
      pendingInvitation('i-pending', 'pending@ecole.test', SchoolRole.MEMBER, {
        expiresAt: future,
        invitedBy: 'admin',
        createdAt: new Date(2026, 0, 3),
      }),
      pendingInvitation('i-expired', 'expired@ecole.test', SchoolRole.MEMBER, {
        expiresAt: past,
        invitedBy: 'admin',
        createdAt: new Date(2026, 0, 2),
      }),
      pendingInvitation('i-accepted', 'accepted@ecole.test', SchoolRole.MEMBER, {
        status: InvitationStatus.ACCEPTED,
        invitedBy: 'admin',
        createdAt: new Date(2026, 0, 1),
      }),
    ]);
    return new ListSchoolInvitationsUseCase(w.schools, invitations.repo, w.authorization);
  };

  it('lists every invitation, most recent first, with the expired status derived', async () => {
    const out = await setup().handle({ schoolId: SCHOOL_ID, performedBy: 'admin' });
    expect(out.items.map((i) => [i.id, i.status])).toEqual([
      ['i-pending', InvitationStatus.PENDING],
      ['i-expired', 'EXPIRED'],
      ['i-accepted', InvitationStatus.ACCEPTED],
    ]);
    expect(out.items[0]).toMatchObject({ invitedBy: 'admin' });
    expect(JSON.stringify(out)).not.toMatch(/token/i);
    expect(out).toMatchObject({ total: 3, page: 1, limit: 20, totalPages: 1 });
  });

  it.each<[TrackedInvitationStatus, string]>([
    [InvitationStatus.PENDING, 'i-pending'],
    ['EXPIRED', 'i-expired'],
    [InvitationStatus.ACCEPTED, 'i-accepted'],
  ])('filters on %s', async (status, id) => {
    const out = await setup().handle({ schoolId: SCHOOL_ID, performedBy: 'admin', status });
    expect(out.items.map((i) => i.id)).toEqual([id]);
  });

  it('searches on the email and paginates', async () => {
    const useCase = setup();
    const found = await useCase.handle({ schoolId: SCHOOL_ID, performedBy: 'admin', search: ' EXPIRED ' });
    expect(found.items.map((i) => i.id)).toEqual(['i-expired']);
    const page = await useCase.handle({ schoolId: SCHOOL_ID, performedBy: 'admin', pagination: { page: 2, limit: 2 } });
    expect(page.items.map((i) => i.id)).toEqual(['i-accepted']);
    expect(page.totalPages).toBe(2);
  });

  it('lets the platform administrator follow invitations, and refuses a member', async () => {
    const useCase = setup();
    await expect(useCase.handle({ schoolId: SCHOOL_ID, performedBy: 'root', platformAdmin: true })).resolves.toBeDefined();
    await expect(useCase.handle({ schoolId: SCHOOL_ID, performedBy: 'staff' })).rejects.toBeInstanceOf(
      SchoolMembershipActionForbiddenException,
    );
  });

  it.each([
    [{ pagination: { page: 0, limit: 10 } }],
    [{ pagination: { page: 1, limit: 101 } }],
    [{ status: 'LOST' as TrackedInvitationStatus }],
    [{ search: 'x'.repeat(201) }],
  ])('rejects invalid parameters %j', async (extra) => {
    await expect(setup().handle({ schoolId: SCHOOL_ID, performedBy: 'admin', ...extra })).rejects.toBeInstanceOf(
      InvalidSchoolMembershipException,
    );
  });
});
