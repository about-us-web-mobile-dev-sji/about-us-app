import { Controller, Delete, Param, Patch, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { AuthGuard, type AuthenticatedRequest } from '../../../../auth/infrastructure/api/guard/auth.guard.js';
import { RolesGuard } from '../../../../auth/infrastructure/api/guard/roles.guard.js';
import { MembershipResponse } from '../dto/responses/membership.response.js';
import { SuspendSchoolMemberUseCase } from '../../../application/use-cases/commands/suspend-school-member/suspend-school-member.js';
import { CancelSchoolMemberSuspensionUseCase } from '../../../application/use-cases/commands/cancel-school-member-suspension/cancel-school-member-suspension.js';
import { RevokeSchoolMemberUseCase } from '../../../application/use-cases/commands/revoke-school-member/revoke-school-member.js';

@Controller('schools')
@UseGuards(AuthGuard, RolesGuard)
export class SchoolMemberController {
  constructor(
    private readonly suspendMember: SuspendSchoolMemberUseCase,
    private readonly cancelMemberSuspension: CancelSchoolMemberSuspensionUseCase,
    private readonly revokeMember: RevokeSchoolMemberUseCase,
  ) {}

  @Patch(':schoolId/members/:memberUserId/suspend')
  async suspendSchoolMember(
    @Param('schoolId') schoolId: string,
    @Param('memberUserId') memberUserId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const performedBy = req.auth.subjectId;
    if (!performedBy) {
      throw new UnauthorizedException('User not authenticated');
    }

    const output = await this.suspendMember.handle({
      schoolId,
      memberUserId,
      performedBy,
      performedByGlobalRole: req.auth.user.globalRole,
    });
    return MembershipResponse.fromOutput(output.membership);
  }

  @Patch(':schoolId/members/:memberUserId/cancel-suspension')
  async cancelSchoolMemberSuspension(
    @Param('schoolId') schoolId: string,
    @Param('memberUserId') memberUserId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const performedBy = req.auth.subjectId;
    if (!performedBy) {
      throw new UnauthorizedException('User not authenticated');
    }

    const output = await this.cancelMemberSuspension.handle({
      schoolId,
      memberUserId,
      performedBy,
      performedByGlobalRole: req.auth.user.globalRole,
    });
    return MembershipResponse.fromOutput(output.membership);
  }

  @Delete(':schoolId/members/:memberUserId')
  async revokeSchoolMember(
    @Param('schoolId') schoolId: string,
    @Param('memberUserId') memberUserId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const performedBy = req.auth.subjectId;
    if (!performedBy) {
      throw new UnauthorizedException('User not authenticated');
    }

    const output = await this.revokeMember.handle({
      schoolId,
      memberUserId,
      performedBy,
      performedByGlobalRole: req.auth.user.globalRole,
    });
    return MembershipResponse.fromOutput(output.membership);
  }
}