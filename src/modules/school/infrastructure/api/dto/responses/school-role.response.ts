import type { SchoolRoleOutput } from '../../../../application/use-cases/school.output.js';

export class SchoolRoleResponse {
  id!: string;
  schoolId!: string;
  key!: string | null;
  name!: string;
  description!: string | null;
  permissions!: string[];
  isSystem!: boolean;
  createdAt!: Date;
  updatedAt!: Date;
  membersCount?: number;

  static fromOutput(output: SchoolRoleOutput & { membersCount?: number }): SchoolRoleResponse {
    return {
      id: output.id,
      schoolId: output.schoolId,
      key: output.key,
      name: output.name,
      description: output.description,
      permissions: output.permissions,
      isSystem: output.isSystem,
      createdAt: output.createdAt,
      updatedAt: output.updatedAt,
      ...(output.membersCount !== undefined && { membersCount: output.membersCount }),
    };
  }
}
