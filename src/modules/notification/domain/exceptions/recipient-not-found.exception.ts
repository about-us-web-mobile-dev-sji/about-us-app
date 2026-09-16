export class RecipientNotFoundException extends Error {
  constructor(message = 'Notification recipient not found') {
    super(message);
    this.name = 'RecipientNotFoundException';
  }
}
