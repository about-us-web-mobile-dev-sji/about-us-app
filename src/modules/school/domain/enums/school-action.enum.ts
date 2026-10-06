// Fixed catalogue of permissions a school role can carry.
export enum SchoolAction {
  INVITE_MEMBER = 'INVITE_MEMBER',
  SUSPEND_MEMBER = 'SUSPEND_MEMBER',
  CANCEL_SUSPENSION = 'CANCEL_SUSPENSION',
  REVOKE_MEMBER = 'REVOKE_MEMBER',
  VIEW_MEMBERS = 'VIEW_MEMBERS',
  VIEW_MEMBER_DETAILS = 'VIEW_MEMBER_DETAILS',
  MANAGE_ROLES = 'MANAGE_ROLES',
  ASSIGN_ROLES = 'ASSIGN_ROLES',
  MANAGE_DOCUMENTS = 'MANAGE_DOCUMENTS',
  SHARE_DOCUMENTS = 'SHARE_DOCUMENTS',
  VIEW_METRICS = 'VIEW_METRICS',
  UPDATE_SCHOOL = 'UPDATE_SCHOOL',
  CHANGE_MEMBER_ROLE = 'CHANGE_MEMBER_ROLE'
}

export const SCHOOL_ACTIONS: readonly SchoolAction[] = Object.values(SchoolAction);

export function isSchoolAction(value: unknown): value is SchoolAction {
  return SCHOOL_ACTIONS.includes(value as SchoolAction);
}
