import { MembershipRole } from '../enums/membership-role.enum.js';
import { MembershipStatus } from '../enums/membership-status.enum.js';
import { SchoolAction } from '../enums/school-action.enum.js';


export const SCHOOL_ROLE_PERMISSIONS: Readonly<
  Record<MembershipRole, readonly SchoolAction[]>
> = {
  [MembershipRole.SCHOOL_ADMIN]: [
    SchoolAction.INVITE_MEMBER,
    SchoolAction.SUSPEND_MEMBER,
    SchoolAction.CANCEL_SUSPENSION,
    SchoolAction.REVOKE_MEMBER,
    SchoolAction.CHANGE_MEMBER_ROLE,
    SchoolAction.VIEW_MEMBERS,
    SchoolAction.VIEW_MEMBER_DETAILS,
    SchoolAction.UPDATE_SCHOOL,
    SchoolAction.MANAGE_MEMBER_PERMISSIONS,
  ],
  [MembershipRole.SCHOOL_MEMBER]: [],
};

export const GRANTABLE_ACTIONS: readonly SchoolAction[] = [
  SchoolAction.VIEW_MEMBERS,
  SchoolAction.VIEW_MEMBER_DETAILS,
  SchoolAction.INVITE_MEMBER,
  SchoolAction.SUSPEND_MEMBER,
  SchoolAction.CANCEL_SUSPENSION,
  SchoolAction.REVOKE_MEMBER,
  SchoolAction.UPDATE_SCHOOL,
];

export function isGrantableAction(value: unknown): value is SchoolAction {
  return GRANTABLE_ACTIONS.includes(value as SchoolAction);
}

export function effectiveSchoolActions(membership: {
  role: MembershipRole;
  status: MembershipStatus;
  grantedPermissions: readonly SchoolAction[];
}): SchoolAction[] {
  if (membership.status !== MembershipStatus.ACTIVE) {
    return [];
  }
  return [
    ...new Set([
      ...SCHOOL_ROLE_PERMISSIONS[membership.role],
      ...membership.grantedPermissions,
    ]),
  ];
}
