import type { OnModuleInit } from '@nestjs/common';
import type { SchoolRepository } from '../../domain/repositories/i-school.repository.js';
import type { SchoolRoleRepository } from '../../domain/repositories/i-school-role.repository.js';
import { ensureSystemRoles } from './school-role-provisioning.js';

export class SchoolRoleBootstrap implements OnModuleInit {
  constructor(
    private readonly schools: SchoolRepository,
    private readonly roles: SchoolRoleRepository,
  ) {}

  async onModuleInit(): Promise<void> {
    for (const school of await this.schools.findAll()) {
      const schoolId = school.toPrimitives().id;
      if (!schoolId) {
        continue;
      }
      await ensureSystemRoles(this.roles, schoolId);
    }
  }
}