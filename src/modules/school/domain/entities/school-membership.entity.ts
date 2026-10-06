import { MembershipStatus } from '../enums/membership-status.enum.js';
import { InvalidSchoolMembershipException } from '../exceptions/invalid-school-membership.exception.js';

export interface SchoolMembershipProps {
  id: string;
  schoolId: string;
  userId: string;
  status: MembershipStatus;
  grantedBy: string | null;
  grantedAt: Date;
  revokedAt: Date | null;
  revokedBy: string | null;
  roleIds: string[];
}

export class SchoolMembership {
  private constructor(private props: SchoolMembershipProps) {}

  static create(input: {
    schoolId: string;
    userId: string;
    roleIds: readonly string[];
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

    const roleIds = [...new Set(input.roleIds.filter((id) => id?.trim()).map((id) => id.trim()))];
    if (roleIds.length === 0) {
      throw new InvalidSchoolMembershipException('At least one role is required');
    }

    return new SchoolMembership({
      id: '',
      schoolId: input.schoolId.trim(),
      userId: input.userId.trim(),
      status: MembershipStatus.ACTIVE,
      grantedBy: input.grantedBy.trim(),
      grantedAt: now,
      revokedAt: null,
      revokedBy: null,
      roleIds,
    });
  }

  static reconstitute(props: SchoolMembershipProps): SchoolMembership {
    return new SchoolMembership(structuredClone(props));
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

  get roleIds(): readonly string[] {
    return [...this.props.roleIds];
  }

  hasRole(roleId: string): boolean {
    return this.props.roleIds.includes(roleId);
  }

  assignRole(roleId: string): boolean {
    this.assertRolesEditable();
    if (!roleId?.trim()) {
      throw new InvalidSchoolMembershipException('Role ID is required');
    }
    if (this.hasRole(roleId)) {
      return false;
    }
    this.props.roleIds.push(roleId.trim());
    return true;
  }

  removeRole(roleId: string): boolean {
    this.assertRolesEditable();
    const index = this.props.roleIds.indexOf(roleId);
    if (index === -1) {
      return false;
    }
    if (this.props.roleIds.length === 1) {
      throw new InvalidSchoolMembershipException('A membership must keep at least one role');
    }
    this.props.roleIds.splice(index, 1);
    return true;
  }

  private assertRolesEditable(): void {
    if (this.props.status !== MembershipStatus.ACTIVE) {
      throw new InvalidSchoolMembershipException('Roles can only be managed on an active membership');
    }
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

  toPrimitives(): SchoolMembershipProps {
    return structuredClone(this.props);
  }
}
