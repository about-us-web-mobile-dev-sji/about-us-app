import { MembershipRole } from '../enums/membership-role.enum.js';
import { MembershipStatus } from '../enums/membership-status.enum.js';
import { SchoolAction } from '../enums/school-action.enum.js';
import { InvalidSchoolMembershipException } from '../exceptions/invalid-school-membership.exception.js';
import { isGrantableAction } from '../policies/school-role-permissions.js';

export interface SchoolMembershipProps {
  id: string;
  schoolId: string;
  userId: string;
  role: MembershipRole;
  status: MembershipStatus;
  grantedBy: string | null;
  grantedAt: Date;
  revokedAt: Date | null;
  revokedBy: string | null;
  grantedPermissions: SchoolAction[];
}

// Rows written before delegation existed carry no grantedPermissions.
export type SchoolMembershipSnapshot = Omit<SchoolMembershipProps, 'grantedPermissions'> & {
  grantedPermissions?: readonly SchoolAction[];
};

export class SchoolMembership {
  private constructor(private props: SchoolMembershipProps) {}

  static create(input: {
    schoolId: string;
    userId: string;
    role: MembershipRole;
    grantedBy: string;
  }): SchoolMembership {
    const now = new Date();

    if (!input.schoolId?.trim()) {
          throw new InvalidSchoolMembershipException('School ID is required');
    }
    if (!input.userId?.trim()) {
          throw new InvalidSchoolMembershipException('User ID is required');
    }
    if (!input.grantedBy?.trim()) {
          throw new InvalidSchoolMembershipException('GrantedBy is required');
    }

    return new SchoolMembership({
      id: '',
      schoolId: input.schoolId.trim(),
      userId: input.userId.trim(),
      role: input.role,
      status: MembershipStatus.ACTIVE,
      grantedBy: input.grantedBy.trim(),
      grantedAt: now,
      revokedAt: null,
      revokedBy: null,
      grantedPermissions: [],
    });
  }

  static reconstitute(props: SchoolMembershipSnapshot): SchoolMembership {
    return new SchoolMembership(
      structuredClone({
        ...props,
        grantedPermissions: [...(props.grantedPermissions ?? [])],
      }),
    );
  }

  get id(): string {
    return this.props.id;
  }

  get schoolId(): string {
    return this.props.schoolId;
  }

  get userId(): string {
    return this.props.userId;
  }

  get role(): MembershipRole {
    return this.props.role;
  }

  get status(): MembershipStatus {
    return this.props.status;
  }

  get grantedBy(): string | null {
    return this.props.grantedBy;
  }

  get grantedAt(): Date {
    return this.props.grantedAt;
  }

  get revokedAt(): Date | null {
    return this.props.revokedAt;
  }

  get revokedBy(): string | null {
    return this.props.revokedBy;
  }

  get grantedPermissions(): readonly SchoolAction[] {
    return [...this.props.grantedPermissions];
  }

  revoke(revokedBy: string): void {
    if (this.props.status === MembershipStatus.REVOKED) {
          throw new InvalidSchoolMembershipException('Membership is already revoked');
    }
    this.props.status = MembershipStatus.REVOKED;
    this.props.revokedAt = new Date();
    this.props.revokedBy = revokedBy;
  }

  deactivate(): void {
    if (this.props.status === MembershipStatus.INACTIVE) {
          throw new InvalidSchoolMembershipException('Membership is already inactive');
    }
    this.props.status = MembershipStatus.INACTIVE;
  }

  suspend(): void {
    if (this.props.status === MembershipStatus.REVOKED) {
          throw new InvalidSchoolMembershipException('Cannot suspend a revoked membership');
    }
    if (this.props.status === MembershipStatus.SUSPENDED) {
          throw new InvalidSchoolMembershipException('Membership is already suspended');
    }
    this.props.status = MembershipStatus.SUSPENDED;
  }

  cancelSuspension(): void {
    if (this.props.status !== MembershipStatus.SUSPENDED) {
          throw new InvalidSchoolMembershipException('Membership is not suspended');
    }
    this.props.status = MembershipStatus.ACTIVE;
  }

  activate(): void {
    if (this.props.status === MembershipStatus.REVOKED) {
          throw new InvalidSchoolMembershipException('Cannot activate a revoked membership');
    }
    this.props.status = MembershipStatus.ACTIVE;
  }

  changeRole(newRole: MembershipRole): void {
    if (this.props.status === MembershipStatus.REVOKED) {
      throw new InvalidSchoolMembershipException('Cannot change the role of a revoked membership');
    }
    if (this.props.role === newRole) {
      throw new InvalidSchoolMembershipException('Membership already has this role');
    }
    this.props.role = newRole;
    // Delegated rights belong to the previous role: start clean.
    this.props.grantedPermissions = [];
  }

  // Returns false when the permission was already held (idempotent).
  grantPermission(action: SchoolAction): boolean {
    this.assertPermissionsEditable(action);
    if (this.props.grantedPermissions.includes(action)) {
      return false;
    }
    this.props.grantedPermissions.push(action);
    return true;
  }

  // Returns false when the permission was not held (idempotent).
  revokePermission(action: SchoolAction): boolean {
    this.assertPermissionsEditable(action);
    const index = this.props.grantedPermissions.indexOf(action);
    if (index === -1) {
      return false;
    }
    this.props.grantedPermissions.splice(index, 1);
    return true;
  }

  private assertPermissionsEditable(action: SchoolAction): void {
    if (!isGrantableAction(action)) {
      throw new InvalidSchoolMembershipException(`Action ${String(action)} cannot be delegated`);
    }
    if (this.props.status !== MembershipStatus.ACTIVE) {
      throw new InvalidSchoolMembershipException('Permissions can only be managed on an active membership');
    }
    if (this.props.role === MembershipRole.SCHOOL_ADMIN) {
      throw new InvalidSchoolMembershipException('A school administrator already holds every school permission');
    }
  }

  toPrimitives(): SchoolMembershipProps {
    return structuredClone(this.props);
  }
}
