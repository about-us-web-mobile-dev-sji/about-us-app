export class SuperAdminEmailConflictException extends Error {
  constructor() {
    super(
      'The initial super admin email is already used by an ordinary account',
    );
    this.name = 'SuperAdminEmailConflictException';
  }
}
