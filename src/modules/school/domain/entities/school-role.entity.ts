import { SchoolRoleKey } from '../enums/school-role-key.enum.js';
import { SCHOOL_ACTIONS, SchoolAction, isSchoolAction } from '../enums/school-action.enum.js';
import { InvalidSchoolRoleException } from '../exceptions/invalid-school-role.exception.js';
import { defaultSchoolRole } from '../policies/default-school-roles.js';

export const SCHOOL_ROLE_NAME_MAX_LENGTH = 60;

export interface SchoolRoleProps {
  id: string;
  schoolId: string;
  key: SchoolRoleKey | null;
  name: string;
  description: string | null;
  permissions: SchoolAction[];
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SchoolRoleChanges {
  name?: string;
  description?: string | null;
  permissions?: readonly SchoolAction[];
}

function normalizePermissions(permissions: readonly SchoolAction[]): SchoolAction[] {
  for (const permission of permissions) {
    if (!isSchoolAction(permission)) {
      throw new InvalidSchoolRoleException(`Unknown permission ${String(permission)}`);
    }
  }
  return [...new Set(permissions)];
}

function normalizeName(name: string | undefined): string {
  const trimmed = name?.trim() ?? '';
  if (!trimmed) {
    throw new InvalidSchoolRoleException('Role name is required');
  }
  if (trimmed.length > SCHOOL_ROLE_NAME_MAX_LENGTH) {
    throw new InvalidSchoolRoleException(
      `Role name must not exceed ${SCHOOL_ROLE_NAME_MAX_LENGTH} characters`,
    );
  }
  return trimmed;
}

export class SchoolRole {
  private constructor(private props: SchoolRoleProps) {}

  static createSystem(schoolId: string, key: SchoolRoleKey): SchoolRole {
    if (!schoolId?.trim()) {
      throw new InvalidSchoolRoleException('School ID is required');
    }
    const definition = defaultSchoolRole(key);
    const now = new Date();
    return new SchoolRole({
      id: '',
      schoolId: schoolId.trim(),
      key,
      name: definition.name,
      description: definition.description,
      permissions: [...definition.permissions],
      isSystem: true,
      createdAt: now,
      updatedAt: now,
    });
  }

  static createCustom(input: {
    schoolId: string;
    name: string;
    description?: string | null;
    permissions?: readonly SchoolAction[];
  }): SchoolRole {
    if (!input.schoolId?.trim()) {
      throw new InvalidSchoolRoleException('School ID is required');
    }
    const now = new Date();
    return new SchoolRole({
      id: '',
      schoolId: input.schoolId.trim(),
      key: null,
      name: normalizeName(input.name),
      description: input.description?.trim() || null,
      permissions: normalizePermissions(input.permissions ?? []),
      isSystem: false,
      createdAt: now,
      updatedAt: now,
    });
  }

  static reconstitute(props: SchoolRoleProps): SchoolRole {
    const copy = structuredClone(props);
    // Codes stored for permissions that left the catalogue are ignored.
    copy.permissions = copy.permissions.filter(isSchoolAction);
    return new SchoolRole(copy);
  }

  get id(): string {
    return this.props.id;
  }

  get schoolId(): string {
    return this.props.schoolId;
  }

  get key(): SchoolRoleKey | null {
    return this.props.key;
  }

  get name(): string {
    return this.props.name;
  }

  get description(): string | null {
    return this.props.description;
  }

  get permissions(): readonly SchoolAction[] {
    if (this.isAdmin) {
      return [...SCHOOL_ACTIONS];
    }
    return [...this.props.permissions];
  }

  get isSystem(): boolean {
    return this.props.isSystem;
  }

  get isAdmin(): boolean {
    return this.props.key === SchoolRoleKey.SCHOOL_ADMIN;
  }

  hasPermission(action: SchoolAction): boolean {
    return this.permissions.includes(action);
  }

  update(changes: SchoolRoleChanges): void {
    if (this.isAdmin) {
      throw new InvalidSchoolRoleException('The administrator role cannot be modified');
    }
    if (changes.name !== undefined) {
      const name = normalizeName(changes.name);
      if (this.props.isSystem && name !== this.props.name) {
        throw new InvalidSchoolRoleException('A system role cannot be renamed');
      }
      this.props.name = name;
    }
    if (changes.description !== undefined) {
      this.props.description = changes.description?.trim() || null;
    }
    if (changes.permissions !== undefined) {
      this.props.permissions = normalizePermissions(changes.permissions);
    }
    this.props.updatedAt = new Date();
  }

  assertDeletable(): void {
    if (this.props.isSystem) {
      throw new InvalidSchoolRoleException('A system role cannot be deleted');
    }
  }

  toPrimitives(): SchoolRoleProps {
    return structuredClone(this.props);
  }
}
