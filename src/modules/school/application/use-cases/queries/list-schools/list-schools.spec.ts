import { describe, expect, it } from 'vitest';
import { GlobalRole } from '../../../../../user/domain/enum/global-role.enum.js';
import { School } from '../../../../domain/entities/school.entity.js';
import { SchoolMembership } from '../../../../domain/entities/school-membership.entity.js';
import { MembershipRole } from '../../../../domain/enums/membership-role.enum.js';
import { MembershipStatus } from '../../../../domain/enums/membership-status.enum.js';
import { SchoolStatus } from '../../../../domain/enums/school-status.enum.js';
import type { SchoolMembershipRepository } from '../../../../domain/repositories/i-school-membership.repository.js';
import type { SchoolRepository } from '../../../../domain/repositories/i-school.repository.js';
import { ListSchoolsUseCase } from './list-schools.js';

describe('ListSchoolsUseCase', () => {
  const ids = [
    '11111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222222',
    '33333333-3333-4333-8333-333333333333',
  ];
  const school = (id: string) =>
    School.reconstitute({
      id: id as never,
      name: `School ${id.slice(0, 2)}`,
      address: null,
      phoneNumber: null,
      email: null,
      website: null,
      status: SchoolStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'root',
    });
  const membership = (schoolId: string, status: MembershipStatus) =>
    SchoolMembership.reconstitute({
      id: `m-${schoolId}`,
      schoolId,
      userId: 'user-1',
      role: MembershipRole.SCHOOL_MEMBER,
      status,
      grantedBy: 'root',
      grantedAt: new Date(),
      revokedAt: null,
      revokedBy: null,
    });

  const setup = (memberships: SchoolMembership[]) => {
    const schools = {
      findAll: async () => ids.map(school),
      findByIds: async (wanted: string[]) => ids.filter((i) => wanted.includes(i)).map(school),
    } as unknown as SchoolRepository;
    const membershipRepo = {
      findActiveByUser: async (userId: string) =>
        memberships.filter((m) => m.userId === userId && m.status === MembershipStatus.ACTIVE),
    } as unknown as SchoolMembershipRepository;
    return new ListSchoolsUseCase(schools, membershipRepo);
  };

  it('returns every school to a super admin', async () => {
    const { schools } = await setup([]).handle({ userId: 'root', globalRole: GlobalRole.SUPER_ADMIN });
    expect(schools.map((s) => s.id)).toEqual(ids);
  });

  it('returns only the schools where a user has an ACTIVE membership', async () => {
    const useCase = setup([
      membership(ids[0], MembershipStatus.ACTIVE),
      membership(ids[1], MembershipStatus.SUSPENDED),
      membership(ids[2], MembershipStatus.REVOKED),
    ]);
    const { schools } = await useCase.handle({ userId: 'user-1', globalRole: GlobalRole.USER });
    expect(schools.map((s) => s.id)).toEqual([ids[0]]);
  });

  it('returns nothing for a user without membership', async () => {
    const { schools } = await setup([]).handle({ userId: 'user-1', globalRole: GlobalRole.USER });
    expect(schools).toEqual([]);
  });
});
