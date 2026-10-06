import { createHash, randomBytes } from 'node:crypto';
import { InvitationStatus } from '../enums/invitation-status.enum.js';
import { SchoolInvitationInvalidException } from '../exceptions/school-invitation-invalid.exception.js';

export const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface SchoolInvitationProps {
  id: string;
  schoolId: string;
  email: string;
  roleId: string;
  tokenHash: string;
  status: InvitationStatus;
  expiresAt: Date;
  invitedBy: string;
  createdAt: Date;
  acceptedAt: Date | null;
  acceptedBy: string | null;
}

export class SchoolInvitation {
  private constructor(private props: SchoolInvitationProps) {}

  static hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /**
   * Creates a pending invitation and the clear-text token to hand to the
   * invitee. Only the token hash is kept on the invitation.
   */
  static issue(
    input: {
      schoolId: string;
      email: string;
      roleId: string;
      invitedBy: string;
      ttlMs?: number;
    },
    now: Date = new Date(),
  ): { invitation: SchoolInvitation; token: string } {
    if (!input.schoolId?.trim()) {
      throw new SchoolInvitationInvalidException('School ID is required');
    }
    if (!input.email?.trim()) {
      throw new SchoolInvitationInvalidException('Invitation email is required');
    }
    if (!input.invitedBy?.trim()) {
      throw new SchoolInvitationInvalidException('InvitedBy is required');
    }
    if (!input.roleId?.trim()) {
      throw new SchoolInvitationInvalidException('Role ID is required');
    }

    const token = randomBytes(32).toString('hex');

    const invitation = new SchoolInvitation({
      id: '',
      schoolId: input.schoolId.trim(),
      email: input.email.trim().toLowerCase(),
      roleId: input.roleId,
      tokenHash: SchoolInvitation.hashToken(token),
      status: InvitationStatus.PENDING,
      expiresAt: new Date(now.getTime() + (input.ttlMs ?? INVITATION_TTL_MS)),
      invitedBy: input.invitedBy.trim(),
      createdAt: now,
      acceptedAt: null,
      acceptedBy: null,
    });

    return { invitation, token };
  }

  static reconstitute(props: SchoolInvitationProps): SchoolInvitation {
    return new SchoolInvitation(structuredClone(props));
  }

  get id(): string {
    return this.props.id;
  }

  get schoolId(): string {
    return this.props.schoolId;
  }

  get email(): string {
    return this.props.email;
  }

  get roleId(): string {
    return this.props.roleId;
  }

  get status(): InvitationStatus {
    return this.props.status;
  }

  get invitedBy(): string {
    return this.props.invitedBy;
  }

  get expiresAt(): Date {
    return this.props.expiresAt;
  }

  isExpired(now: Date = new Date()): boolean {
    return this.props.expiresAt.getTime() <= now.getTime();
  }

  ensureAcceptable(now: Date = new Date()): void {
    if (this.props.status !== InvitationStatus.PENDING || this.isExpired(now)) {
      throw new SchoolInvitationInvalidException();
    }
  }

  accept(userId: string, now: Date = new Date()): void {
    this.ensureAcceptable(now);
    if (!userId?.trim()) {
      throw new SchoolInvitationInvalidException('User ID is required');
    }
    this.props.status = InvitationStatus.ACCEPTED;
    this.props.acceptedAt = now;
    this.props.acceptedBy = userId.trim();
  }

  cancel(): void {
    if (this.props.status !== InvitationStatus.PENDING) {
      throw new SchoolInvitationInvalidException();
    }
    this.props.status = InvitationStatus.CANCELLED;
  }

  toPrimitives(): SchoolInvitationProps {
    return structuredClone(this.props);
  }
}
