import { BadRequestException, Body, Controller, DefaultValuePipe, Delete, Get, HttpCode, Param, ParseIntPipe, Post, Query, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { UserDirectory } from '../../../../user/application/user-directory.js';
import { AcceptInvitationDto } from '../dto/accept-invitation.dto.js';
import { InviteSchoolMemberDto } from '../dto/invite-school-member.dto.js';
import { InviteSchoolMemberUseCase } from '../../../application/use-cases/commands/invite-school-member/invite-school-member.js';
import { AuthGuard, type AuthenticatedRequest } from '../../../../auth/infrastructure/api/guard/auth.guard.js';
import { RolesGuard } from '../../../../auth/infrastructure/api/guard/roles.guard.js';
import { AcceptInvitationResponse } from '../dto/responses/accept-invitation.response.js';
import { InvitationResponse } from '../dto/responses/invitation.response.js';
import { GlobalRole } from '../../../../user/domain/enum/global-role.enum.js';
import { AcceptSchoolInvitation } from '../../../application/use-cases/commands/accept-school-invitation/accept-school-invitation.js';
import { ListSchoolInvitationsUseCase } from '../../../application/use-cases/queries/list-school-invitations/list-school-invitations.js';
import { CancelSchoolInvitationUseCase } from '../../../application/use-cases/commands/cancel-school-invitation/cancel-school-invitation.js';
import { ResendSchoolInvitationUseCase } from '../../../application/use-cases/commands/resend-school-invitation/resend-school-invitation.js';
import { InvitationTrackingResponse } from '../dto/responses/invitation-tracking.response.js';
import { InvitationStatus } from '../../../domain/enums/invitation-status.enum.js';
import type { TrackedInvitationStatus } from '../../../domain/repositories/i-school-invitation.repository.js';

const TRACKED_STATUSES: string[] = [...Object.values(InvitationStatus), 'EXPIRED'];

@Controller('schools')
@UseGuards(AuthGuard, RolesGuard)
export class SchoolInvitationController {
  constructor(
    private readonly acceptSchoolInvitation: AcceptSchoolInvitation,
    private readonly inviteMember: InviteSchoolMemberUseCase,
    private readonly listInvitations: ListSchoolInvitationsUseCase,
    private readonly cancelInvitation: CancelSchoolInvitationUseCase,
    private readonly resendInvitation: ResendSchoolInvitationUseCase,
    private readonly directory: UserDirectory,
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
    const users = await this.directory.summaries(AcceptInvitationResponse.userIdsOf(output));
    return AcceptInvitationResponse.fromOutput(output, users);
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
      performedBy,
      // The platform administrator may invite in any school without being a member.
      platformAdmin: req.auth.user.globalRole === GlobalRole.SUPER_ADMIN,
    });
    return InvitationResponse.fromOutput(output);
  }

  @Get(':schoolId/invitations')
  async listSchoolInvitations(
    @Param('schoolId') schoolId: string,
    @Query('status') status: string | undefined,
    @Query('search') search: string | undefined,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Req() req: AuthenticatedRequest,
  ) {
    const performedBy = req.auth.subjectId;
    if (!performedBy) {
      throw new UnauthorizedException('User not authenticated');
    }
    if (status !== undefined && !TRACKED_STATUSES.includes(status)) {
      throw new BadRequestException('Status must be PENDING, ACCEPTED, CANCELLED or EXPIRED');
    }

    const output = await this.listInvitations.handle({
      schoolId,
      performedBy,
      platformAdmin: req.auth.user.globalRole === GlobalRole.SUPER_ADMIN,
      status: status as TrackedInvitationStatus | undefined,
      search,
      pagination: { page, limit },
    });
    const users = await this.directory.summaries(output.items.flatMap(InvitationTrackingResponse.userIdsOf));
    return {
      items: output.items.map((invitation) => InvitationTrackingResponse.fromOutput(invitation, users)),
      total: output.total,
      page: output.page,
      limit: output.limit,
      totalPages: output.totalPages,
    };
  }

  @Post(':schoolId/invitations/:invitationId/resend')
  async resendSchoolInvitation(
    @Param('schoolId') schoolId: string,
    @Param('invitationId') invitationId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const performedBy = req.auth.subjectId;
    if (!performedBy) {
      throw new UnauthorizedException('User not authenticated');
    }

    const output = await this.resendInvitation.handle({
      schoolId,
      invitationId,
      performedBy,
      platformAdmin: req.auth.user.globalRole === GlobalRole.SUPER_ADMIN,
    });
    return InvitationResponse.fromOutput(output);
  }

  @Delete(':schoolId/invitations/:invitationId')
  @HttpCode(200)
  async cancelSchoolInvitation(
    @Param('schoolId') schoolId: string,
    @Param('invitationId') invitationId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const performedBy = req.auth.subjectId;
    if (!performedBy) {
      throw new UnauthorizedException('User not authenticated');
    }

    const output = await this.cancelInvitation.handle({
      schoolId,
      invitationId,
      performedBy,
      platformAdmin: req.auth.user.globalRole === GlobalRole.SUPER_ADMIN,
    });
    const users = await this.directory.summaries(InvitationTrackingResponse.userIdsOf(output.invitation));
    return InvitationTrackingResponse.fromOutput(output.invitation, users);
  }
}
