import { describe, expect, it } from 'vitest';
import { SchoolRole } from './school-role.entity.js';
import { SchoolAction } from '../enums/school-action.enum.js';
import { SchoolRoleKey } from '../enums/school-role-key.enum.js';
import { DEFAULT_SCHOOL_ROLES } from '../policies/default-school-roles.js';
import { InvalidSchoolRoleException } from '../exceptions/invalid-school-role.exception.js';

const SCHOOL = '11111111-1111-4111-8111-111111111111';

describe('SchoolRole', () => {
  it('creates the administrator system role with the whole catalogue', () => {
    const role = SchoolRole.createSystem(SCHOOL, SchoolRoleKey.SCHOOL_ADMIN);
    expect(role.isAdmin).toBe(true);
    expect(role.isSystem).toBe(true);
    expect([...role.permissions].sort()).toEqual(Object.values(SchoolAction).sort());
  });

  it('creates STAFF, FIELD_TECHNICIAN and STUDENT with their default permissions', () => {
    expect(SchoolRole.createSystem(SCHOOL, SchoolRoleKey.STAFF).permissions).toEqual([
      SchoolAction.VIEW_MEMBERS,
    ]);
    expect(SchoolRole.createSystem(SCHOOL, SchoolRoleKey.FIELD_TECHNICIAN).permissions).toEqual([]);
    expect(SchoolRole.createSystem(SCHOOL, SchoolRoleKey.STUDENT).permissions).toEqual([]);
  });

  it('creates the content manager: documents, rights and metrics, no administration', () => {
    const role = SchoolRole.createSystem(SCHOOL, SchoolRoleKey.CONTENT_MANAGER);
    expect(role.name).toBe('Responsable de contenu');
    expect([...role.permissions].sort()).toEqual(
      [
        SchoolAction.VIEW_MEMBERS,
        SchoolAction.MANAGE_DOCUMENTS,
        SchoolAction.SHARE_DOCUMENTS,
        SchoolAction.VIEW_METRICS,
      ].sort(),
    );
    for (const forbidden of [
      SchoolAction.MANAGE_ROLES,
      SchoolAction.ASSIGN_ROLES,
      SchoolAction.SUSPEND_MEMBER,
      SchoolAction.REVOKE_MEMBER,
      SchoolAction.INVITE_MEMBER,
    ]) {
      expect(role.hasPermission(forbidden)).toBe(false);
    }
  });

  it('keeps the administrator on the whole catalogue even when the database is behind', () => {
    const stale = SchoolRole.reconstitute({
      ...SchoolRole.createSystem(SCHOOL, SchoolRoleKey.SCHOOL_ADMIN).toPrimitives(),
      permissions: [SchoolAction.VIEW_MEMBERS],
    });
    expect([...stale.permissions].sort()).toEqual(Object.values(SchoolAction).sort());
    expect(stale.hasPermission(SchoolAction.MANAGE_DOCUMENTS)).toBe(true);
  });

  it('seeds exactly one system role per key', () => {
    expect(new Set(DEFAULT_SCHOOL_ROLES.map((d) => d.key))).toEqual(
      new Set(Object.values(SchoolRoleKey)),
    );
  });

  describe('createCustom', () => {
    it('trims the name and removes duplicate permissions', () => {
      const role = SchoolRole.createCustom({
        schoolId: SCHOOL,
        name: '  Surveillant ',
        permissions: [SchoolAction.VIEW_MEMBERS, SchoolAction.VIEW_MEMBERS],
      });
      expect(role.name).toBe('Surveillant');
      expect(role.permissions).toEqual([SchoolAction.VIEW_MEMBERS]);
      expect(role.key).toBeNull();
      expect(role.isSystem).toBe(false);
    });

    it.each([['   '], ['x'.repeat(61)]])('refuses the invalid name %j', (name) => {
      expect(() => SchoolRole.createCustom({ schoolId: SCHOOL, name })).toThrow(
        InvalidSchoolRoleException,
      );
    });

    it('refuses a permission outside the catalogue', () => {
      expect(() =>
        SchoolRole.createCustom({
          schoolId: SCHOOL,
          name: 'Rôle',
          permissions: ['FLY' as SchoolAction],
        }),
      ).toThrow(InvalidSchoolRoleException);
    });
  });

  describe('update', () => {
    it('never modifies the administrator role', () => {
      const admin = SchoolRole.createSystem(SCHOOL, SchoolRoleKey.SCHOOL_ADMIN);
      expect(() => admin.update({ permissions: [] })).toThrow(InvalidSchoolRoleException);
    });

    it('lets a system role keep its name but change its permissions', () => {
      const staff = SchoolRole.createSystem(SCHOOL, SchoolRoleKey.STAFF);
      staff.update({ name: staff.name, permissions: [SchoolAction.VIEW_MEMBER_DETAILS] });
      expect(staff.permissions).toEqual([SchoolAction.VIEW_MEMBER_DETAILS]);
    });

    it('refuses to rename a system role', () => {
      const staff = SchoolRole.createSystem(SCHOOL, SchoolRoleKey.STAFF);
      expect(() => staff.update({ name: 'Autre' })).toThrow(InvalidSchoolRoleException);
    });

    it('lets a custom role change everything', () => {
      const role = SchoolRole.createCustom({ schoolId: SCHOOL, name: 'A' });
      role.update({ name: 'B', description: 'desc', permissions: [SchoolAction.INVITE_MEMBER] });
      expect(role.name).toBe('B');
      expect(role.description).toBe('desc');
      expect(role.permissions).toEqual([SchoolAction.INVITE_MEMBER]);
    });
  });

  it('only deletes custom roles', () => {
    expect(() =>
      SchoolRole.createSystem(SCHOOL, SchoolRoleKey.STUDENT).assertDeletable(),
    ).toThrow(InvalidSchoolRoleException);
    expect(() =>
      SchoolRole.createCustom({ schoolId: SCHOOL, name: 'A' }).assertDeletable(),
    ).not.toThrow();
  });
});
