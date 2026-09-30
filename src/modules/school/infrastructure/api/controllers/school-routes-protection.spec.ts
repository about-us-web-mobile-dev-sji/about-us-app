import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../../../../auth/infrastructure/api/guard/roles.guard.js';
import { GlobalRole } from '../../../../user/domain/enum/global-role.enum.js';
import { SchoolController } from './school.controller.js';
import { SchoolAdministrationController } from './school-administration.controller.js';

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
    ['POST /schools', SchoolController, 'create'],
    ['PATCH /schools/:id/toggle-block', SchoolAdministrationController, 'toggleBlock'],
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

  it('GET /schools is open to any authenticated USER (filtered in the use case)', () => {
    expect(guard.canActivate(contextFor(SchoolController, 'findAll', GlobalRole.USER))).toBe(true);
  });
});
