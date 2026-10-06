export class NotificationNotFoundException extends Error {
  constructor(message = 'Notification not found') {
    super(message);
    this.name = 'NotificationNotFoundException';
  }
}
