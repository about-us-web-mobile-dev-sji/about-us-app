export class InvalidNotificationException extends Error {
  constructor(message = 'Invalid notification') {
    super(message);
    this.name = 'InvalidNotificationException';
  }
}
