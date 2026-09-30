import { Body, Controller, Param, Post, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { AcceptInvitationDto } from '../dto/accept-invitation.dto.js';
import { InviteSchoolMemberDto } from '../dto/invite-school-member.dto.js';
import { InviteSchoolMemberUseCase } from '../../../application/use-cases/commands/invite-school-member/invite-school-member.js';
import { AuthGuard, type AuthenticatedRequest } from '../../../../auth/infrastructure/api/guard/auth.guard.js';
import { RolesGuard } from '../../../../auth/infrastructure/api/guard/roles.guard.js';
import { AcceptInvitationResponse } from '../dto/responses/accept-invitation.response.js';
import { InvitationResponse } from '../dto/responses/invitation.response.js';
import { AcceptSchoolInvitation } from '../../../application/use-cases/commands/accept-school-invitation/accept-school-invitation.js';

@Controller('schools')
@UseGuards(AuthGuard, RolesGuard)
export class SchoolInvitationController {
  constructor(
    private readonly acceptSchoolInvitation: AcceptSchoolInvitation,
    private readonly inviteMember: InviteSchoolMemberUseCase,
  ) {}

  @Post(':id/accept')
  async acceptInvitation(
    @Param('id') id: string,
    @Body() dto: AcceptInvitationDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.auth.subjectId;
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    const output = await this.acceptSchoolInvitation.handle({
      schoolId: id,
      token: dto.token,
      userId,
    });
    return AcceptInvitationResponse.fromOutput(output);
  }

  @Post(':schoolId/invitations')
  async inviteSchoolMember(
    @Param('schoolId') schoolId: string,
    @Body() dto: InviteSchoolMemberDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const performedBy = req.auth.subjectId;
    if (!performedBy) {
      throw new UnauthorizedException('User not authenticated');
    }

    const output = await this.inviteMember.handle({
      schoolId,
      email: dto.email,
      role: dto.role,
      performedBy,
      performedByGlobalRole: req.auth.user.globalRole,
    });
    return InvitationResponse.fromOutput(output);
  }
}