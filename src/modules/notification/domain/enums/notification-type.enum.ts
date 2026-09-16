export enum NotificationType {
  WELCOME = 'WELCOME',
  MEMBER_INVITED = 'MEMBER_INVITED',
  MEMBER_JOINED = 'MEMBER_JOINED',
  MEMBER_ROLE_CHANGED = 'MEMBER_ROLE_CHANGED',
  SECURITY_ALERT = 'SECURITY_ALERT',
}

export const notificationTypes = Object.values(NotificationType);
