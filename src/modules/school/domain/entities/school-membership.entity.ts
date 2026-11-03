import { MembershipStatus } from '../enums/membership-status.enum.js';
import { SchoolRole } from '../enums/school-role.enum.js';
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
  role: SchoolRole;
}

export class SchoolMembership {
  private constructor(private props: SchoolMembershipProps) {}

  static create(input: {
    schoolId: string;
    userId: string;
    role?: SchoolRole;
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

    const role = input.role ?? SchoolRole.MEMBER;
    if (!Object.values(SchoolRole).includes(role)) {
      throw new InvalidSchoolMembershipException('Invalid school role');
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
      role,
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

  get role(): SchoolRole {
    return this.props.role;
  }

  get isAdmin(): boolean {
    return this.props.role === SchoolRole.ADMIN;
  }

  // Returns false when the member already holds that role.
  changeRole(role: SchoolRole): boolean {
    if (!Object.values(SchoolRole).includes(role)) {
      throw new InvalidSchoolMembershipException('Invalid school role');
    }
    if (this.props.status === MembershipStatus.REVOKED) {
      throw new InvalidSchoolMembershipException('Cannot change the role of a revoked membership');
    }
    if (this.props.role === role) {
      return false;
    }
    this.props.role = role;
    return true;
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
