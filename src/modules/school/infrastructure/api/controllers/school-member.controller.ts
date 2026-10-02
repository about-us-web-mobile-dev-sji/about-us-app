import { Body, Controller, Delete, Get, Param, ParseEnumPipe, Patch, Put, Query, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { AuthGuard, type AuthenticatedRequest } from '../../../../auth/infrastructure/api/guard/auth.guard.js';
import { RolesGuard } from '../../../../auth/infrastructure/api/guard/roles.guard.js';
import { MembershipResponse } from '../dto/responses/membership.response.js';
import { SuspendSchoolMemberUseCase } from '../../../application/use-cases/commands/suspend-school-member/suspend-school-member.js';
import { CancelSchoolMemberSuspensionUseCase } from '../../../application/use-cases/commands/cancel-school-member-suspension/cancel-school-member-suspension.js';
import { ChangeSchoolMemberRoleUseCase } from '../../../application/use-cases/commands/change-school-member-role/change-school-member-role.js';
import { ListSchoolMembersUseCase } from '../../../application/use-cases/queries/list-school-members/list-school-members.js';
import { ChangeSchoolMemberRoleDto } from '../dto/change-school-member-role.dto.js';
import { MembershipStatus } from '../../../domain/enums/membership-status.enum.js';
import { RevokeSchoolMemberUseCase } from '../../../application/use-cases/commands/revoke-school-member/revoke-school-member.js';
import { GrantSchoolMemberPermissionUseCase } from '../../../application/use-cases/commands/grant-school-member-permission/grant-school-member-permission.js';
import { RevokeSchoolMemberPermissionUseCase } from '../../../application/use-cases/commands/revoke-school-member-permission/revoke-school-member-permission.js';
import { GetSchoolMemberPermissionsUseCase } from '../../../application/use-cases/queries/get-school-member-permissions/get-school-member-permissions.js';
import { GetMySchoolPermissionsUseCase } from '../../../application/use-cases/queries/get-my-school-permissions/get-my-school-permissions.js';
import { MemberPermissionsResponse } from '../dto/responses/member-permissions.response.js';

@Controller('schools')
@UseGuards(AuthGuard, RolesGuard)
export class SchoolMemberController {
  constructor(
    private readonly suspendMember: SuspendSchoolMemberUseCase,
    private readonly cancelMemberSuspension: CancelSchoolMemberSuspensionUseCase,
    private readonly revokeMember: RevokeSchoolMemberUseCase,
    private readonly changeMemberRole: ChangeSchoolMemberRoleUseCase,
    private readonly listMembers: ListSchoolMembersUseCase,
    private readonly grantPermission: GrantSchoolMemberPermissionUseCase,
    private readonly revokePermission: RevokeSchoolMemberPermissionUseCase,
    private readonly getMemberPermissions: GetSchoolMemberPermissionsUseCase,
    private readonly getMyPermissions: GetMySchoolPermissionsUseCase,
  ) {}

  @Get(':schoolId/members')
  async listSchoolMembers(
    @Param('schoolId') schoolId: string,
    @Query('status', new ParseEnumPipe(MembershipStatus, { optional: true }))
    status: MembershipStatus | undefined,
    @Req() req: AuthenticatedRequest,
  ) {
    const performedBy = req.auth.subjectId;
    if (!performedBy) {
      throw new UnauthorizedException('User not authenticated');
    }

    const output = await this.listMembers.handle({
      schoolId,
      performedBy,
      performedByGlobalRole: req.auth.user.globalRole,
      status,
    });
    return output.view === 'full'
      ? output.members.map((m) => MembershipResponse.fromOutput(m))
      : output.members;
  }

  @Get(':schoolId/me/permissions')
  async myPermissions(
    @Param('schoolId') schoolId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const performedBy = req.auth.subjectId;
    if (!performedBy) {
      throw new UnauthorizedException('User not authenticated');
    }
    const { role, status, actions } = await this.getMyPermissions.handle({
      schoolId,
      performedBy,
      performedByGlobalRole: req.auth.user.globalRole,
    });
    return { role, status, actions };
  }

  @Get(':schoolId/members/:memberUserId/permissions')
  async getSchoolMemberPermissions(
    @Param('schoolId') schoolId: string,
    @Param('memberUserId') memberUserId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const performedBy = req.auth.subjectId;
    if (!performedBy) {
      throw new UnauthorizedException('User not authenticated');
    }
    const output = await this.getMemberPermissions.handle({
      schoolId,
      memberUserId,
      performedBy,
      performedByGlobalRole: req.auth.user.globalRole,
    });
    return MemberPermissionsResponse.fromMembership(output.membership);
  }

  // `action` is validated against the GRANTABLE_ACTIONS whitelist in the use case.
  @Put(':schoolId/members/:memberUserId/permissions/:action')
  async grantSchoolMemberPermission(
    @Param('schoolId') schoolId: string,
    @Param('memberUserId') memberUserId: string,
    @Param('action') action: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const performedBy = req.auth.subjectId;
    if (!performedBy) {
      throw new UnauthorizedException('User not authenticated');
    }
    const output = await this.grantPermission.handle({
      schoolId,
      memberUserId,
      action,
      performedBy,
      performedByGlobalRole: req.auth.user.globalRole,
    });
    return MemberPermissionsResponse.fromMembership(output.membership);
  }

  @Delete(':schoolId/members/:memberUserId/permissions/:action')
  async revokeSchoolMemberPermission(
    @Param('schoolId') schoolId: string,
    @Param('memberUserId') memberUserId: string,
    @Param('action') action: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const performedBy = req.auth.subjectId;
    if (!performedBy) {
      throw new UnauthorizedException('User not authenticated');
    }
    const output = await this.revokePermission.handle({
      schoolId,
      memberUserId,
      action,
      performedBy,
      performedByGlobalRole: req.auth.user.globalRole,
    });
    return MemberPermissionsResponse.fromMembership(output.membership);
  }

  @Patch(':schoolId/members/:memberUserId/role')
  async changeSchoolMemberRole(
    @Param('schoolId') schoolId: string,
    @Param('memberUserId') memberUserId: string,
    @Body() dto: ChangeSchoolMemberRoleDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const performedBy = req.auth.subjectId;
    if (!performedBy) {
      throw new UnauthorizedException('User not authenticated');
    }

    const output = await this.changeMemberRole.handle({
      schoolId,
      memberUserId,
      newRole: dto.role,
      performedBy,
      performedByGlobalRole: req.auth.user.globalRole,
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