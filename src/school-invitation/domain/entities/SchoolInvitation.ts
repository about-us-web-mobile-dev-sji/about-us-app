import { Email } from '../../../shared/domain/value-objects/Email.js';
import { InvitationStatus } from '../enums/InvitationStatus.js';

export class SchoolInvitation {
  constructor(
    private readonly id: string,
    private readonly schoolId: string,
    private readonly email: Email,
    private readonly tokenHash: string,
    private status: InvitationStatus,
    private readonly expiresAt: Date,
    private acceptedAt: Date | null,
    private acceptedBy: string | null,
    private readonly createdBy: string,
    private readonly createdAt: Date,
  ) {}

  getId(): string {
    return this.id;
  }

  getSchoolId(): string {
    return this.schoolId;
  }

  getEmail(): Email {
    return this.email;
  }

  getTokenHash(): string {
    return this.tokenHash;
  }

  getStatus(): InvitationStatus {
    return this.status;
  }

  getExpiresAt(): Date {
    return this.expiresAt;
  }

  getAcceptedAt(): Date | null {
    return this.acceptedAt;
  }

  getAcceptedBy(): string | null {
    return this.acceptedBy;
  }

  getCreatedBy(): string {
    return this.createdBy;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  isPending(): boolean {
    return this.status === InvitationStatus.PENDING;
  }

  canBeAccepted(): boolean {
    return this.isPending() && !this.isExpired();
  }

  markAsAccepted(userId: string): void {
    if (!this.canBeAccepted()) {
      throw new Error('Invitation cannot be accepted');
    }
    this.status = InvitationStatus.ACCEPTED;
    this.acceptedAt = new Date();
    this.acceptedBy = userId;
  }

  markAsExpired(): void {
    this.status = InvitationStatus.EXPIRED;
  }

  cancel(): void {
    if (this.status === InvitationStatus.ACCEPTED) {
      throw new Error('Cannot cancel an accepted invitation');
    }
    this.status = InvitationStatus.CANCELLED;
  }
}
