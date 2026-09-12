import { Injectable, Inject } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import { SchoolRepository } from '../../../../../school/domain/repositories/SchoolRepository.js';
import { SchoolMembershipRepository } from '../../../../domain/repositories/SchoolMembershipRepository.js';
import { UserRepository } from '../../../../../user/domain/repositories/UserRepository.js';
import { SchoolInvitationRepository } from '../../../../../school-invitation/domain/repositories/SchoolInvitationRepository.js';
import { AuditService } from '../../../../../audit/application/services/AuditService.js';
import { SchoolNotFoundException } from '../../../../../school/domain/exceptions/SchoolNotFoundException.js';
import { UserNotFoundException } from '../../../../../user/domain/exceptions/UserNotFoundException.js';
import { SchoolMembership } from '../../../../domain/entities/SchoolMembership.js';
import { MembershipStatus } from '../../../../domain/enums/MembershipStatus.js';
import { Role } from '../../../../../shared/domain/enums/Role.js';
import { Email } from '../../../../../shared/domain/value-objects/Email.js';
import { AuditAction } from '../../../../../audit/domain/enums/AuditAction.js';
import { ReplaceSchoolAdministratorInput } from './ReplaceSchoolAdministratorInput.js';
import { ReplaceSchoolAdministratorOutput } from './ReplaceSchoolAdministratorOutput.js';
import { SchoolInvitation } from '../../../../../school-invitation/domain/entities/SchoolInvitation.js';
import { InvitationStatus } from '../../../../../school-invitation/domain/enums/InvitationStatus.js';
import { InvitationTokenService } from '../../../../../school-invitation/application/services/InvitationTokenService.js';
import { InvitationAlreadyExistsException } from '../../../../../school-invitation/domain/exceptions/InvitationAlreadyExistsException.js';

@Injectable()
export class ReplaceSchoolAdministrator {
  constructor(
    private readonly schoolRepository: SchoolRepository,
    private readonly membershipRepository: SchoolMembershipRepository,
    private readonly userRepository: UserRepository,
    private readonly schoolInvitationRepository: SchoolInvitationRepository,
    private readonly auditService: AuditService,
    private readonly invitationTokenService: InvitationTokenService,
    @Inject('DataSource') private readonly dataSource: DataSource,
  ) {}

  async execute(input: ReplaceSchoolAdministratorInput): Promise<ReplaceSchoolAdministratorOutput> {
    // Load school
    const school = await this.schoolRepository.findById(input.schoolId);
    if (!school) {
      throw new SchoolNotFoundException(input.schoolId);
    }

    // Load current primary administrator membership
    const currentAdminMembership = await this.membershipRepository.findPrimaryAdministratorBySchoolId(
      input.schoolId,
    );

    let newAdministratorId: string | null = null;
    let invitationSent = false;

    // Start transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Case 1: New administrator exists (by ID)
      if (input.newAdministratorId) {
        const newAdmin = await this.userRepository.findById(input.newAdministratorId);
        if (!newAdmin) {
          throw new UserNotFoundException(input.newAdministratorId);
        }

        newAdministratorId = input.newAdministratorId;

        // Deactivate old primary admin membership if exists
        if (currentAdminMembership) {
          currentAdminMembership.setPrimaryAdministrator(false);
          currentAdminMembership.deactivate();
          await this.membershipRepository.save(currentAdminMembership);
        }

        // Check if new admin already has a membership
        let newMembership = await this.membershipRepository.findByUserIdAndSchoolId(
          newAdministratorId,
          input.schoolId,
        );

        if (newMembership) {
          // Update existing membership
          newMembership.setPrimaryAdministrator(true);
          newMembership.activate();
          newMembership.changeRole(Role.SCHOOL_ADMIN);
        } else {
          // Create new membership
          newMembership = new SchoolMembership(
            randomUUID(),
            newAdministratorId,
            input.schoolId,
            Role.SCHOOL_ADMIN,
            MembershipStatus.ACTIVE,
            true,
            new Date(),
            null,
            new Date(),
            new Date(),
          );
        }

        await this.membershipRepository.save(newMembership);

        // Update school main administrator
        school.assignMainAdministrator(newAdministratorId);
        await this.schoolRepository.save(school);
      }
      // Case 2: New administrator by email (invitation flow)
      else if (input.newAdministratorEmail) {
        const email = Email.create(input.newAdministratorEmail);

        // Check if user already exists with this email
        const existingUser = await this.userRepository.findByEmail(email);

        if (existingUser) {
          // User exists, treat as Case 1
          newAdministratorId = existingUser.getId();

          // Deactivate old primary admin membership if exists
          if (currentAdminMembership) {
            currentAdminMembership.setPrimaryAdministrator(false);
            currentAdminMembership.deactivate();
            await this.membershipRepository.save(currentAdminMembership);
          }

          // Check if they already have a membership
          let newMembership = await this.membershipRepository.findByUserIdAndSchoolId(
            newAdministratorId,
            input.schoolId,
          );

          if (newMembership) {
            newMembership.setPrimaryAdministrator(true);
            newMembership.activate();
            newMembership.changeRole(Role.SCHOOL_ADMIN);
          } else {
            newMembership = new SchoolMembership(
              randomUUID(),
              newAdministratorId,
              input.schoolId,
              Role.SCHOOL_ADMIN,
              MembershipStatus.ACTIVE,
              true,
              new Date(),
              null,
              new Date(),
              new Date(),
            );
          }

          await this.membershipRepository.save(newMembership);

          // Update school
          school.assignMainAdministrator(newAdministratorId);
          await this.schoolRepository.save(school);
        } else {
          // User doesn't exist, create invitation
          
          // Check for pending invitations
          const pendingInvitation = await this.schoolInvitationRepository.findPendingBySchoolAndEmail(
            input.schoolId,
            email,
          );

          if (pendingInvitation && pendingInvitation.canBeAccepted()) {
            throw new InvitationAlreadyExistsException(input.newAdministratorEmail);
          }

          // Deactivate old admin membership (but don't assign new admin yet)
          if (currentAdminMembership) {
            currentAdminMembership.setPrimaryAdministrator(false);
            currentAdminMembership.deactivate();
            await this.membershipRepository.save(currentAdminMembership);
          }

          // Generate secure token
          const { rawToken, tokenHash } = this.invitationTokenService.generateToken();
          const expiresAt = this.invitationTokenService.calculateExpirationDate();

          // Create invitation
          const invitation = new SchoolInvitation(
            randomUUID(),
            input.schoolId,
            email,
            tokenHash,
            InvitationStatus.PENDING,
            expiresAt,
            null,
            null,
            input.replacedBy,
            new Date(),
          );

          await this.schoolInvitationRepository.save(invitation);

          // Note: Email sending would happen here (omitted for now)
          invitationSent = true;

          // Don't update school.mainAdministratorId yet - will be set when invitation is accepted
        }
      }

      // Create audit log
      await this.auditService.log(
        AuditAction.ADMINISTRATOR_REPLACED,
        'School',
        input.schoolId,
        input.replacedBy,
        {
          previousAdministratorId: currentAdminMembership?.getUserId() || null,
          newAdministratorId,
          invitationSent,
          newAdministratorEmail: input.newAdministratorEmail || null,
        },
      );

      // Commit transaction
      await queryRunner.commitTransaction();

      return new ReplaceSchoolAdministratorOutput(
        input.schoolId,
        currentAdminMembership?.getUserId() || null,
        newAdministratorId,
        invitationSent,
        new Date(),
      );
    } catch (error) {
      // Rollback transaction
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
