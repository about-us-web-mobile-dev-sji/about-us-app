import { Role } from '../../../shared/domain/enums/Role.js';
import { Email } from '../../../shared/domain/value-objects/Email.js';

export class User {
  constructor(
    private readonly id: string,
    private email: Email,
    private firstName: string,
    private lastName: string,
    private passwordHash: string,
    private roles: Role[],
    private readonly createdAt: Date,
    private updatedAt: Date,
  ) {}

  getId(): string {
    return this.id;
  }

  getEmail(): Email {
    return this.email;
  }

  getFirstName(): string {
    return this.firstName;
  }

  getLastName(): string {
    return this.lastName;
  }

  getPasswordHash(): string {
    return this.passwordHash;
  }

  getRoles(): Role[] {
    return [...this.roles];
  }

  hasRole(role: Role): boolean {
    return this.roles.includes(role);
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }

  updateEmail(email: Email): void {
    this.email = email;
    this.updatedAt = new Date();
  }

  updatePassword(passwordHash: string): void {
    this.passwordHash = passwordHash;
    this.updatedAt = new Date();
  }

  addRole(role: Role): void {
    if (!this.hasRole(role)) {
      this.roles.push(role);
      this.updatedAt = new Date();
    }
  }

  removeRole(role: Role): void {
    this.roles = this.roles.filter((r) => r !== role);
    this.updatedAt = new Date();
  }
}
