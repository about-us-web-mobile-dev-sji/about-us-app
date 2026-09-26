import { UUID } from 'crypto';
import { SpaceMembershipRole } from '../enums/space-membership-role.js';
import { SpaceMembershipStatus } from '../enums/space-membership-status.js';
import { SpaceMemberAlreadyExistsException, SpaceMemberNotFoundException } from '../exceptions/space.exceptions.js';

export interface SpaceMembershipProps {
  id?: UUID;
  spaceId: UUID;
  userId: UUID;
  role: SpaceMembershipRole;
  status: SpaceMembershipStatus;
  grantedBy: UUID | null;
  grantedAt: Date;
  revokedAt: Date | null;
  revokedBy: UUID | null;
}

export type NewSpaceMembership = Omit<SpaceMembershipProps, 'id' | 'grantedAt' | 'revokedAt' | 'revokedBy'>;

export class SpaceMembership {
  private constructor(private props: SpaceMembershipProps) {}

  static create(input: {
    spaceId: UUID;
    userId: UUID;
    role: SpaceMembershipRole;
    grantedBy: UUID | null;
  }): SpaceMembership {
    const now = new Date();
    const props: SpaceMembershipProps = {
      id: crypto.randomUUID(),
      spaceId: input.spaceId,
      userId: input.userId,
      role: input.role,
      status: SpaceMembershipStatus.ACTIVE,
      grantedBy: input.grantedBy,
      grantedAt: now,
      revokedAt: null,
      revokedBy: null,
    };
    return new SpaceMembership(props);
  }

  static reconstitute(props: SpaceMembershipProps): SpaceMembership {
    return new SpaceMembership(props);
  }

  get id(): UUID | undefined {
    return this.props.id;
  }

  get spaceId(): UUID {
    return this.props.spaceId;
  }

  get userId(): UUID {
    return this.props.userId;
  }

  get role(): SpaceMembershipRole {
    return this.props.role;
  }

  get status(): SpaceMembershipStatus {
    return this.props.status;
  }

  get grantedBy(): UUID | null {
    return this.props.grantedBy;
  }

  get grantedAt(): Date {
    return this.props.grantedAt;
  }

  get revokedAt(): Date | null {
    return this.props.revokedAt;
  }

  get revokedBy(): UUID | null {
    return this.props.revokedBy;
  }

  isActive(): boolean {
    return this.props.status === SpaceMembershipStatus.ACTIVE;
  }

  isRemoved(): boolean {
    return this.props.status === SpaceMembershipStatus.REMOVED;
  }

  isManager(): boolean {
    return this.props.role === SpaceMembershipRole.MANAGER && this.isActive();
  }

  isMember(): boolean {
    return this.props.role === SpaceMembershipRole.MEMBER && this.isActive();
  }

  promoteToManager(): void {
    if (this.isRemoved()) throw new SpaceMemberNotFoundException(this.props.userId, this.props.spaceId);
    if (this.isManager()) return;
    this.props.role = SpaceMembershipRole.MANAGER;
  }

  demoteToMember(): void {
    if (this.isRemoved()) throw new SpaceMemberNotFoundException(this.props.userId, this.props.spaceId);
    if (this.isMember()) return;
    this.props.role = SpaceMembershipRole.MEMBER;
  }

  remove(revokedBy: UUID): void {
    if (this.isRemoved()) throw new SpaceMemberNotFoundException(this.props.userId, this.props.spaceId);
    this.props.status = SpaceMembershipStatus.REMOVED;
    this.props.revokedAt = new Date();
    this.props.revokedBy = revokedBy;
  }

  reactivate(grantedBy: UUID): void {
    if (this.isActive()) throw new SpaceMemberAlreadyExistsException(this.props.userId, this.props.spaceId);
    this.props.status = SpaceMembershipStatus.ACTIVE;
    this.props.revokedAt = null;
    this.props.revokedBy = null;
    this.props.grantedBy = grantedBy;
    this.props.grantedAt = new Date();
  }

  toPrimitives(): SpaceMembershipProps {
    return { ...this.props };
  }
}