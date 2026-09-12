import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SchoolMembershipPersistenceModel } from './infrastructure/persistence/entities/SchoolMembershipPersistenceModel.js';
import { TypeOrmSchoolMembershipRepository } from './infrastructure/persistence/repositories/TypeOrmSchoolMembershipRepository.js';
import { SchoolMembershipRepository } from './domain/repositories/SchoolMembershipRepository.js';
import { ReplaceSchoolAdministrator } from './application/use-cases/commands/replace-school-administrator/ReplaceSchoolAdministrator.js';
import { SchoolMembershipController } from './infrastructure/api/controllers/SchoolMembershipController.js';
import { SchoolModule } from '../school/school.module.js';
import { UserModule } from '../user/user.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { AuthModule } from '../auth/auth.module.js';

// Import SchoolInvitation module when created
// import { SchoolInvitationModule } from '../school-invitation/school-invitation.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([SchoolMembershipPersistenceModel]),
    SchoolModule,
    UserModule,
    AuditModule,
    AuthModule,
    // SchoolInvitationModule, // Add when created
  ],
  providers: [
    {
      provide: 'SchoolMembershipRepository',
      useClass: TypeOrmSchoolMembershipRepository,
    },
    {
      provide: SchoolMembershipRepository,
      useExisting: 'SchoolMembershipRepository',
    },
    ReplaceSchoolAdministrator,
  ],
  controllers: [SchoolMembershipController],
  exports: ['SchoolMembershipRepository', SchoolMembershipRepository],
})
export class SchoolMembershipModule {}
