import 'reflect-metadata';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../../../../auth/infrastructure/api/guard/roles.guard.js';
import { ROLES_KEY } from '../../../../auth/infrastructure/api/decorators/roles.decorator.js';
import { GlobalRole } from '../../../../user/domain/enum/global-role.enum.js';
import { SchoolController } from './school.controller.js';
import { SchoolAdministrationController } from './school-administration.controller.js';
import { SchoolInvitationController } from './school-invitation.controller.js';
import { SchoolMemberController } from './school-member.controller.js';
import { SchoolRoleController } from './school-role.controller.js';

const contextFor = (
  controller: new (...args: never[]) => object,
  method: string,
  globalRole: GlobalRole,
): ExecutionContext =>
  ({
    getHandler: () => (controller.prototype as Record<string, () => unknown>)[method],
    getClass: () => controller,
    switchToHttp: () => ({
      getRequest: () => ({ auth: { user: { id: 'u-1', globalRole } } }),
    }),
  }) as unknown as ExecutionContext;

describe('school routes protected by @Roles(SUPER_ADMIN)', () => {
  const guard = new RolesGuard(new Reflector());

  const routes: Array<[string, new (...args: never[]) => object, string]> = [
    ['GET /schools', SchoolController, 'findAll'],
    ['POST /schools', SchoolController, 'create'],
    ['GET /schools/:schoolId/roles', SchoolRoleController, 'list'],
    ['POST /schools/:schoolId/roles', SchoolRoleController, 'create'],
    ['PATCH /schools/:schoolId/roles/:roleId', SchoolRoleController, 'update'],
    ['DELETE /schools/:schoolId/roles/:roleId', SchoolRoleController, 'remove'],
    ['PATCH /schools/:id/toggle-block', SchoolAdministrationController, 'toggleBlock'],
    ['PATCH /schools/:id/disable', SchoolAdministrationController, 'disable'],
    ['PATCH /schools/:schoolId', SchoolAdministrationController, 'update'],
    ['PATCH /schools/:schoolId/administrator', SchoolAdministrationController, 'replaceAdministrator'],
  ];

  it.each(routes)('%s answers 403 to a USER', (_label, controller, method) => {
    expect(() => guard.canActivate(contextFor(controller, method, GlobalRole.USER))).toThrow(
      ForbiddenException,
    );
  });

  it.each(routes)('%s lets a SUPER_ADMIN through', (_label, controller, method) => {
    expect(guard.canActivate(contextFor(controller, method, GlobalRole.SUPER_ADMIN))).toBe(true);
  });

});

const handlersOf = (controller: new (...args: never[]) => object) =>
  Object.getOwnPropertyNames(controller.prototype).filter(
    (name) =>
      name !== 'constructor' &&
      typeof (controller.prototype as unknown as Record<string, unknown>)[name] === 'function',
  );

describe('school authorization rests on the school roles, not on the global role', () => {
  it('limits school and role controllers to the platform administrator', () => {
    expect(Reflect.getMetadata(ROLES_KEY, SchoolController)).toEqual([GlobalRole.SUPER_ADMIN]);
    expect(Reflect.getMetadata(ROLES_KEY, SchoolRoleController)).toEqual([GlobalRole.SUPER_ADMIN]);

    const withRoles: string[] = [];
    for (const controller of [
      SchoolController,
      SchoolAdministrationController,
      SchoolInvitationController,
      SchoolMemberController,
      SchoolRoleController,
    ]) {
      for (const name of handlersOf(controller)) {
        const metadata = Reflect.getMetadata(
          ROLES_KEY,
          (controller.prototype as unknown as Record<string, object>)[name],
        );
        if (metadata) withRoles.push(`${controller.name}.${name}`);
      }
    }
    expect(withRoles.sort()).toEqual([
      'SchoolAdministrationController.disable',
      'SchoolAdministrationController.replaceAdministrator',
      'SchoolAdministrationController.toggleBlock',
      'SchoolAdministrationController.update',
    ]);
  });

  it('no use case, service or entity reads the global role (list-schools is the platform view)', () => {
    const root = join(__dirname, '..', '..', '..');
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const path = join(dir, entry);
        if (statSync(path).isDirectory()) walk(path);
        else if (path.endsWith('.ts') && !path.endsWith('.spec.ts')) files.push(path);
      }
    };
    walk(join(root, 'application'));
    walk(join(root, 'domain'));
    const offenders = files
      .filter((file) => /GlobalRole|globalRole/.test(readFileSync(file, 'utf8')))
      .filter((file) => !file.includes('list-schools'))
      .map((file) => file.slice(root.length));
    expect(offenders).toEqual([]);
  });

  it('the application and domain layers never import the infrastructure layer', () => {
    const root = join(__dirname, '..', '..', '..');
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const path = join(dir, entry);
        if (statSync(path).isDirectory()) walk(path);
        else if (path.endsWith('.ts') && !path.endsWith('.spec.ts')) {
          if (/from '(\.\.\/)+infrastructure\//.test(readFileSync(path, 'utf8'))) {
            offenders.push(path.slice(root.length));
          }
        }
      }
    };
    walk(join(root, 'application'));
    walk(join(root, 'domain'));
    expect(offenders).toEqual([]);
  });

  it('nothing of the former model remains in the sources', () => {
    const root = join(__dirname, '..', '..', '..');
    const forbidden = /MembershipRole\b|grantedPermissions|performedByGlobalRole|MANAGE_MEMBER_PERMISSIONS|CHANGE_MEMBER_ROLE|INVITE_ADMIN|UPDATE_SCHOOL|findActiveAdminBySchool/;
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const path = join(dir, entry);
        if (statSync(path).isDirectory()) walk(path);
        else if (path.endsWith('.ts') && !path.endsWith('.spec.ts') && forbidden.test(readFileSync(path, 'utf8'))) {
          offenders.push(path.slice(root.length));
        }
      }
    };
    walk(root);
    expect(offenders).toEqual([]);
  });
});
