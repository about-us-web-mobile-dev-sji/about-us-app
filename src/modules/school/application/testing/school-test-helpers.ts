import type { EventEmitter2 } from '@nestjs/event-emitter';
import { SchoolInvitation } from '../../domain/entities/school-invitation.entity.js';
import { InvitationStatus } from '../../domain/enums/invitation-status.enum.js';
import type { SchoolInvitationRepository } from '../../domain/repositories/i-school-invitation.repository.js';
import { SchoolMembership } from '../../domain/entities/school-membership.entity.js';
import { MembershipStatus } from '../../domain/enums/membership-status.enum.js';
import { SchoolRole } from '../../domain/enums/school-role.enum.js';
import { SchoolStatus } from '../../domain/enums/school-status.enum.js';
import type { SchoolMembershipRepository } from '../../domain/repositories/i-school-membership.repository.js';
import type { SchoolRepository } from '../../domain/repositories/i-school.repository.js';
import { SchoolAuthorizationService } from '../services/school-authorization.service.js';

export const SCHOOL_ID = '11111111-1111-4111-8111-111111111111';

export const membershipOf = (
  userId: string,
  role: SchoolRole = SchoolRole.MEMBER,
  status: MembershipStatus = MembershipStatus.ACTIVE,
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
  });

export const inMemoryMemberships = (initial: SchoolMembership[]) => {
  let stored = [...initial];
  let nextId = 1;
  const repo = {
    findById: async (id: string) => stored.find((m) => m.id === id) ?? null,
    findBySchoolAndUser: async (sId: string, uId: string) =>
      stored.find((m) => m.schoolId === sId && m.userId === uId) ?? null,
    findBySchool: async (sId: string) => stored.filter((m) => m.schoolId === sId),
    findBySchoolPaginated: async (
      sId: string,
      filters: { statuses: readonly MembershipStatus[]; role?: SchoolRole },
      pagination: { page: number; limit: number },
    ) => {
      const matching = stored
        .filter(
          (m) =>
            m.schoolId === sId &&
            filters.statuses.includes(m.status) &&
            (!filters.role || m.role === filters.role),
        )
        .sort((a, b) => a.grantedAt.getTime() - b.grantedAt.getTime());
      const start = (pagination.page - 1) * pagination.limit;
      return {
        items: matching.slice(start, start + pagination.limit),
        total: matching.length,
        page: pagination.page,
        limit: pagination.limit,
        totalPages: Math.ceil(matching.length / pagination.limit),
      };
    },
    findActiveByUser: async (userId: string) =>
      stored.filter((m) => m.userId === userId && m.status === MembershipStatus.ACTIVE),
    save: async (m: SchoolMembership) => {
      const saved = m.id
        ? m
        : SchoolMembership.reconstitute({ ...m.toPrimitives(), id: `new-membership-${nextId++}` });
      stored = stored.some((x) => x.id === saved.id)
        ? stored.map((x) => (x.id === saved.id ? saved : x))
        : [...stored, saved];
      return saved;
    },
  } as unknown as SchoolMembershipRepository;
  return {
    repo,
    all: () => stored,
    get: (userId: string) => stored.find((m) => m.userId === userId)!,
  };
};

export const schoolsRepo = (status: SchoolStatus = SchoolStatus.ACTIVE, found = true) =>
  ({
    findById: async () =>
      found ? { status, name: 'École test', toPrimitives: () => ({ name: 'École test' }) } : null,
  }) as unknown as SchoolRepository;

export const authorizationFor = (
  memberships: SchoolMembershipRepository,
  schools: SchoolRepository,
) => new SchoolAuthorizationService(memberships, schools);

// Ready-made world: memberships + authorization over an ACTIVE school.
export const world = (
  members: SchoolMembership[],
  options: { schoolStatus?: SchoolStatus } = {},
) => {
  const memberships = inMemoryMemberships(members);
  const schools = schoolsRepo(options.schoolStatus);
  return {
    memberships,
    schools,
    authorization: authorizationFor(memberships.repo, schools),
  };
};

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

export const inMemoryInvitations = (initial: SchoolInvitation[] = []) => {
  let stored = [...initial];
  let nextId = 1;
  const repo: SchoolInvitationRepository = {
    findByTokenHash: async () => null,
    findById: async (id) => stored.find((i) => i.id === id) ?? null,
    findBySchoolPaginated: async (sId, filters, { page, limit }, now = new Date()) => {
      const matching = stored
        .filter((i) => i.schoolId === sId)
        .filter((i) => !filters.status || i.trackedStatus(now) === filters.status)
        .filter((i) => !filters.search || i.email.includes(filters.search.toLowerCase()))
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      return {
        items: matching.slice((page - 1) * limit, page * limit),
        total: matching.length,
        page,
        limit,
        totalPages: Math.ceil(matching.length / limit),
      };
    },
    hasPendingForEmail: async (email) =>
      stored.some(
        (i) => i.email === email && i.status === InvitationStatus.PENDING && !i.isExpired(),
      ),
    findPendingBySchoolAndEmail: async (sId, email) =>
      stored.filter(
        (i) => i.schoolId === sId && i.email === email && i.status === InvitationStatus.PENDING,
      ),
    save: async (invitation) => {
      const saved = invitation.id
        ? invitation
        : SchoolInvitation.reconstitute({ ...invitation.toPrimitives(), id: `invitation-${nextId++}` });
      stored = stored.some((x) => x.id === saved.id)
        ? stored.map((x) => (x.id === saved.id ? saved : x))
        : [...stored, saved];
      return saved;
    },
  };
  return { repo, all: () => stored };
};

export const pendingInvitation = (
  id: string,
  email: string,
  role: SchoolRole = SchoolRole.MEMBER,
  overrides: Partial<ReturnType<SchoolInvitation['toPrimitives']>> = {},
): SchoolInvitation =>
  SchoolInvitation.reconstitute({
    id,
    schoolId: SCHOOL_ID,
    email,
    role,
    tokenHash: `hash-${id}`,
    status: InvitationStatus.PENDING,
    expiresAt: new Date(Date.now() + 3 * 24 * 3600 * 1000),
    invitedBy: 'admin',
    createdAt: new Date(2026, 0, 1),
    acceptedAt: null,
    acceptedBy: null,
    ...overrides,
  });
