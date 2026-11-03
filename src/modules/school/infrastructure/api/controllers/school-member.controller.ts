import { Controller, DefaultValuePipe, Delete, Get, Param, ParseEnumPipe, ParseIntPipe, Patch, Query, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { AuthGuard, type AuthenticatedRequest } from '../../../../auth/infrastructure/api/guard/auth.guard.js';
import { RolesGuard } from '../../../../auth/infrastructure/api/guard/roles.guard.js';
import { MembershipResponse } from '../dto/responses/membership.response.js';
import { SuspendSchoolMemberUseCase } from '../../../application/use-cases/commands/suspend-school-member/suspend-school-member.js';
import { CancelSchoolMemberSuspensionUseCase } from '../../../application/use-cases/commands/cancel-school-member-suspension/cancel-school-member-suspension.js';
import { ListSchoolMembersUseCase } from '../../../application/use-cases/queries/list-school-members/list-school-members.js';
import { MembershipStatus } from '../../../domain/enums/membership-status.enum.js';
import { SchoolRole } from '../../../domain/enums/school-role.enum.js';
import { UserDirectory, summaryOf } from '../../../../user/application/user-directory.js';
import { RevokeSchoolMemberUseCase } from '../../../application/use-cases/commands/revoke-school-member/revoke-school-member.js';

@Controller('schools')
@UseGuards(AuthGuard, RolesGuard)
export class SchoolMemberController {
  constructor(
    private readonly suspendMember: SuspendSchoolMemberUseCase,
    private readonly cancelMemberSuspension: CancelSchoolMemberSuspensionUseCase,
    private readonly revokeMember: RevokeSchoolMemberUseCase,
    private readonly listMembers: ListSchoolMembersUseCase,
    private readonly directory: UserDirectory,
  ) {}

  @Get(':schoolId/members')
  async listSchoolMembers(
    @Param('schoolId') schoolId: string,
    @Query('status', new ParseEnumPipe(MembershipStatus, { optional: true }))
    status: MembershipStatus | undefined,
    @Query('role', new ParseEnumPipe(SchoolRole, { optional: true }))
    role: SchoolRole | undefined,
    @Query('search') search: string | undefined,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Req() req: AuthenticatedRequest,
  ) {
    const performedBy = req.auth.subjectId;
    if (!performedBy) {
      throw new UnauthorizedException('User not authenticated');
    }

    const output = await this.listMembers.handle({
      schoolId,
      performedBy,
      status,
      role,
      search,
      pagination: { page, limit },
    });
    const users = await this.directory.summaries(
      output.view === 'full'
        ? output.items.flatMap(MembershipResponse.userIdsOf)
        : output.items.map((member) => member.userId),
    );
    return {
      items: output.view === 'full'
        ? output.items.map((member) => MembershipResponse.fromOutput(member, users))
        // A member sees who the others are, but not their e-mail address.
        : output.items.map((member) => ({
            user: { ...summaryOf(users, member.userId), email: null },
            role: member.role,
          })),
      total: output.total,
      page: output.page,
      limit: output.limit,
      totalPages: output.totalPages,
    };
  }

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
    });
    const users = await this.directory.summaries(MembershipResponse.userIdsOf(output.membership));
    return MembershipResponse.fromOutput(output.membership, users);
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
    });
    const users = await this.directory.summaries(MembershipResponse.userIdsOf(output.membership));
    return MembershipResponse.fromOutput(output.membership, users);
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
    });
    const users = await this.directory.summaries(MembershipResponse.userIdsOf(output.membership));
    return MembershipResponse.fromOutput(output.membership, users);
  }
}