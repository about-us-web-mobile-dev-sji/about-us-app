import type { EventEmitter2 } from '@nestjs/event-emitter';
import { SchoolMembership } from '../../domain/entities/school-membership.entity.js';
import { MembershipRole } from '../../domain/enums/membership-role.enum.js';
import { MembershipStatus } from '../../domain/enums/membership-status.enum.js';
import type { SchoolAction } from '../../domain/enums/school-action.enum.js';
import { SchoolStatus } from '../../domain/enums/school-status.enum.js';
import type { SchoolMembershipRepository } from '../../domain/repositories/i-school-membership.repository.js';
import type { SchoolRepository } from '../../domain/repositories/i-school.repository.js';
import { SchoolAuthorizationService } from '../services/school-authorization.service.js';

export const SCHOOL_ID = '11111111-1111-4111-8111-111111111111';

export const membershipOf = (
  userId: string,
  role: MembershipRole = MembershipRole.SCHOOL_MEMBER,
  status: MembershipStatus = MembershipStatus.ACTIVE,
  grantedPermissions: SchoolAction[] = [],
): SchoolMembership =>
  SchoolMembership.reconstitute({
    id: `m-${userId}`,
    schoolId: SCHOOL_ID,
    userId,
    role,
    status,
    grantedBy: 'root',
    grantedAt: new Date(2026, 0, 1),
    revokedAt: null,
    revokedBy: null,
    grantedPermissions,
  });

export const inMemoryMemberships = (initial: SchoolMembership[]) => {
  let stored = [...initial];
  const repo = {
    findById: async (id: string) => stored.find((m) => m.id === id) ?? null,
    findBySchoolAndUser: async (sId: string, uId: string) =>
      stored.find((m) => m.schoolId === sId && m.userId === uId) ?? null,
    findBySchool: async (sId: string) => stored.filter((m) => m.schoolId === sId),
    save: async (m: SchoolMembership) => {
      stored = stored.map((x) => (x.id === m.id ? m : x));
      return m;
    },
  } as unknown as SchoolMembershipRepository;
  return { repo, all: () => stored, get: (userId: string) => stored.find((m) => m.userId === userId)! };
};

export const schoolsRepo = (status: SchoolStatus = SchoolStatus.ACTIVE, found = true) =>
  ({
    findById: async () =>
      found ? { status, toPrimitives: () => ({ name: 'École test' }) } : null,
  }) as unknown as SchoolRepository;

export const authorizationFor = (repo: SchoolMembershipRepository, schools: SchoolRepository) =>
  new SchoolAuthorizationService(repo, schools);

export const recordingEmitter = () => {
  const events: Array<{ name: string; payload: Record<string, unknown> }> = [];
  const emitter = {
    emit: (name: string, payload: Record<string, unknown>) => {
      events.push({ name, payload });
      return true;
    },
  } as unknown as EventEmitter2;
  return { emitter, events };
};
