import type { EventEmitter2 } from '@nestjs/event-emitter';
import { SchoolInvitation } from '../../domain/entities/school-invitation.entity.js';
import { InvitationStatus } from '../../domain/enums/invitation-status.enum.js';
import type { SchoolInvitationRepository } from '../../domain/repositories/i-school-invitation.repository.js';
import { SchoolMembership } from '../../domain/entities/school-membership.entity.js';
import { SchoolRole } from '../../domain/entities/school-role.entity.js';
import { MembershipStatus } from '../../domain/enums/membership-status.enum.js';
import { SchoolAction } from '../../domain/enums/school-action.enum.js';
import { SchoolRoleKey } from '../../domain/enums/school-role-key.enum.js';
import { SchoolStatus } from '../../domain/enums/school-status.enum.js';
import { DEFAULT_SCHOOL_ROLES } from '../../domain/policies/default-school-roles.js';
import type { SchoolMembershipRepository } from '../../domain/repositories/i-school-membership.repository.js';
import type { SchoolRoleRepository } from '../../domain/repositories/i-school-role.repository.js';
import type { SchoolRepository } from '../../domain/repositories/i-school.repository.js';
import { SchoolAuthorizationService } from '../services/school-authorization.service.js';

export const SCHOOL_ID = '11111111-1111-4111-8111-111111111111';

export const ROLE = {
  admin: 'role-admin',
  contentManager: 'role-content-manager',
  staff: 'role-staff',
  technician: 'role-technician',
  student: 'role-student',
} as const;

const SYSTEM_IDS: Record<SchoolRoleKey, string> = {
  [SchoolRoleKey.SCHOOL_ADMIN]: ROLE.admin,
  [SchoolRoleKey.CONTENT_MANAGER]: ROLE.contentManager,
  [SchoolRoleKey.STAFF]: ROLE.staff,
  [SchoolRoleKey.FIELD_TECHNICIAN]: ROLE.technician,
  [SchoolRoleKey.STUDENT]: ROLE.student,
};

// The three system roles of SCHOOL_ID with their default permissions.
export const defaultRoles = (schoolId = SCHOOL_ID): SchoolRole[] =>
  DEFAULT_SCHOOL_ROLES.map((definition) =>
    SchoolRole.reconstitute({
      id: SYSTEM_IDS[definition.key],
      schoolId,
      key: definition.key,
      name: definition.name,
      description: definition.description,
      permissions: [...definition.permissions],
      isSystem: true,
      createdAt: new Date(2026, 0, 1),
      updatedAt: new Date(2026, 0, 1),
    }),
  );

export const customRole = (
  id: string,
  name: string,
  permissions: SchoolAction[] = [],
  schoolId = SCHOOL_ID,
): SchoolRole =>
  SchoolRole.reconstitute({
    id,
    schoolId,
    key: null,
    name,
    description: null,
    permissions,
    isSystem: false,
    createdAt: new Date(2026, 0, 1),
    updatedAt: new Date(2026, 0, 1),
  });

export const membershipOf = (
  userId: string,
  roleIds: string[] = [ROLE.student],
  status: MembershipStatus = MembershipStatus.ACTIVE,
): SchoolMembership =>
  SchoolMembership.reconstitute({
    id: `m-${userId}`,
    schoolId: SCHOOL_ID,
    userId,
    roleIds,
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
    findByRole: async (roleId: string) => stored.filter((m) => m.hasRole(roleId)),
    findBySchoolPaginated: async (
      sId: string,
      filters: { statuses: readonly MembershipStatus[]; roleId?: string },
      pagination: { page: number; limit: number },
    ) => {
      const matching = stored
        .filter(
          (m) =>
            m.schoolId === sId &&
            filters.statuses.includes(m.status) &&
            (!filters.roleId || m.hasRole(filters.roleId)),
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

export const inMemoryRoles = (initial: SchoolRole[] = defaultRoles()) => {
  let stored = [...initial];
  let nextId = 1;
  const repo: SchoolRoleRepository = {
    ensurePermissionCatalogue: async () => {},
    findById: async (id) => stored.find((r) => r.id === id) ?? null,
    findByIds: async (ids) => stored.filter((r) => ids.includes(r.id)),
    findBySchool: async (sId) => stored.filter((r) => r.schoolId === sId),
    findByKey: async (sId, key) =>
      stored.find((r) => r.schoolId === sId && r.key === key) ?? null,
    existsByName: async (sId, name, excludeId) =>
      stored.some(
        (r) =>
          r.schoolId === sId &&
          r.id !== excludeId &&
          r.name.toLowerCase() === name.trim().toLowerCase(),
      ),
    save: async (role) => {
      const saved = role.id
        ? role
        : SchoolRole.reconstitute({ ...role.toPrimitives(), id: `new-role-${nextId++}` });
      stored = stored.some((x) => x.id === saved.id)
        ? stored.map((x) => (x.id === saved.id ? saved : x))
        : [...stored, saved];
      return saved;
    },
    delete: async (id) => {
      stored = stored.filter((r) => r.id !== id);
    },
  };
  return { repo, all: () => stored };
};

export const schoolsRepo = (status: SchoolStatus = SchoolStatus.ACTIVE, found = true) =>
  ({
    findById: async () =>
      found ? { status, name: 'École test', toPrimitives: () => ({ name: 'École test' }) } : null,
  }) as unknown as SchoolRepository;

export const authorizationFor = (
  memberships: SchoolMembershipRepository,
  roles: SchoolRoleRepository,
  schools: SchoolRepository,
) => new SchoolAuthorizationService(memberships, roles, schools);

// Ready-made world: roles + memberships + authorization over an ACTIVE school.
export const world = (
  members: SchoolMembership[],
  options: { roles?: SchoolRole[]; schoolStatus?: SchoolStatus } = {},
) => {
  const memberships = inMemoryMemberships(members);
  const roles = inMemoryRoles(options.roles);
  const schools = schoolsRepo(options.schoolStatus);
  return {
    memberships,
    roles,
    schools,
    authorization: authorizationFor(memberships.repo, roles.repo, schools),
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
  roleId: string = ROLE.student,
  overrides: Partial<ReturnType<SchoolInvitation['toPrimitives']>> = {},
): SchoolInvitation =>
  SchoolInvitation.reconstitute({
    id,
    schoolId: SCHOOL_ID,
    email,
    roleId,
    tokenHash: `hash-${id}`,
    status: InvitationStatus.PENDING,
    expiresAt: new Date(Date.now() + 3 * 24 * 3600 * 1000),
    invitedBy: 'admin',
    createdAt: new Date(2026, 0, 1),
    acceptedAt: null,
    acceptedBy: null,
    ...overrides,
  });
