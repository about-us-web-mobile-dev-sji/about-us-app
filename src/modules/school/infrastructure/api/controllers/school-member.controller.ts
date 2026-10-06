import { Controller, DefaultValuePipe, Delete, Get, Param, ParseEnumPipe, ParseIntPipe, Patch, Post, Query, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { AuthGuard, type AuthenticatedRequest } from '../../../../auth/infrastructure/api/guard/auth.guard.js';
import { RolesGuard } from '../../../../auth/infrastructure/api/guard/roles.guard.js';
import { MembershipResponse } from '../dto/responses/membership.response.js';
import { SuspendSchoolMemberUseCase } from '../../../application/use-cases/commands/suspend-school-member/suspend-school-member.js';
import { CancelSchoolMemberSuspensionUseCase } from '../../../application/use-cases/commands/cancel-school-member-suspension/cancel-school-member-suspension.js';
import { AssignSchoolMemberRoleUseCase } from '../../../application/use-cases/commands/assign-school-member-role/assign-school-member-role.js';
import { RemoveSchoolMemberRoleUseCase } from '../../../application/use-cases/commands/remove-school-member-role/remove-school-member-role.js';
import { ListSchoolMembersUseCase } from '../../../application/use-cases/queries/list-school-members/list-school-members.js';
import { MembershipStatus } from '../../../domain/enums/membership-status.enum.js';
import { RevokeSchoolMemberUseCase } from '../../../application/use-cases/commands/revoke-school-member/revoke-school-member.js';

@Controller('schools')
@UseGuards(AuthGuard, RolesGuard)
export class SchoolMemberController {
  constructor(
    private readonly suspendMember: SuspendSchoolMemberUseCase,
    private readonly cancelMemberSuspension: CancelSchoolMemberSuspensionUseCase,
    private readonly revokeMember: RevokeSchoolMemberUseCase,
    private readonly assignMemberRole: AssignSchoolMemberRoleUseCase,
    private readonly removeMemberRole: RemoveSchoolMemberRoleUseCase,
    private readonly listMembers: ListSchoolMembersUseCase
  ) {}

  @Get(':schoolId/members')
  async listSchoolMembers(
    @Param('schoolId') schoolId: string,
    @Query('status', new ParseEnumPipe(MembershipStatus, { optional: true }))
    status: MembershipStatus | undefined,
    @Query('roleId') roleId: string | undefined,
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
      roleId,
      search,
      pagination: { page, limit },
    });
    return {
      items: output.view === 'full'
        ? output.items.map((member) => MembershipResponse.fromOutput(member))
        : output.items,
      total: output.total,
      page: output.page,
      limit: output.limit,
      totalPages: output.totalPages,
    };
  }

  @Post(':schoolId/members/:memberUserId/roles/:roleId')
  async assignSchoolMemberRole(
    @Param('schoolId') schoolId: string,
    @Param('memberUserId') memberUserId: string,
    @Param('roleId') roleId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const performedBy = req.auth.subjectId;
    if (!performedBy) {
      throw new UnauthorizedException('User not authenticated');
    }

    const output = await this.assignMemberRole.handle({
      schoolId,
      memberUserId,
      roleId,
      performedBy,
    });
    return MembershipResponse.fromOutput(output.membership);
  }

  @Delete(':schoolId/members/:memberUserId/roles/:roleId')
  async removeSchoolMemberRole(
    @Param('schoolId') schoolId: string,
    @Param('memberUserId') memberUserId: string,
    @Param('roleId') roleId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const performedBy = req.auth.subjectId;
    if (!performedBy) {
      throw new UnauthorizedException('User not authenticated');
    }
    const output = await this.removeMemberRole.handle({
      schoolId,
      memberUserId,
      roleId,
      performedBy,
    });
    return MembershipResponse.fromOutput(output.membership);
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
    });
    return MembershipResponse.fromOutput(output.membership);
  }
}