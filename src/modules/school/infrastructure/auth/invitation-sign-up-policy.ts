import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import { SignUpPolicyRegistry } from '../../../auth/infrastructure/services/sign-up-policy.registry.js';
import {
  SCHOOL_INVITATION_REPOSITORY,
  type SchoolInvitationRepository,
} from '../../domain/repositories/i-school-invitation.repository.js';

/** Only people with a pending school invitation may create an account. */
@Injectable()
export class InvitationSignUpPolicy implements OnModuleInit {
  constructor(
    @Inject(SignUpPolicyRegistry) private readonly registry: SignUpPolicyRegistry,
    @Inject(SCHOOL_INVITATION_REPOSITORY)
    private readonly invitations: SchoolInvitationRepository,
  ) {}

  onModuleInit(): void {
    this.registry.register((email) => this.invitations.hasPendingForEmail(email));
  }
}
