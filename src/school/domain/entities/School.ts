import { SchoolStatus } from '../enums/SchoolStatus.js';

export class School {
  constructor(
    private readonly id: string,
    private identifier: string,
    private name: string,
    private description: string,
    private address: string,
    private city: string,
    private postalCode: string,
    private country: string,
    private status: SchoolStatus,
    private mainAdministratorId: string | null,
    private readonly createdBy: string,
    private readonly createdAt: Date,
    private updatedAt: Date,
  ) {}

  getId(): string {
    return this.id;
  }

  getIdentifier(): string {
    return this.identifier;
  }

  getName(): string {
    return this.name;
  }

  getDescription(): string {
    return this.description;
  }

  getAddress(): string {
    return this.address;
  }

  getCity(): string {
    return this.city;
  }

  getPostalCode(): string {
    return this.postalCode;
  }

  getCountry(): string {
    return this.country;
  }

  getStatus(): SchoolStatus {
    return this.status;
  }

  getMainAdministratorId(): string | null {
    return this.mainAdministratorId;
  }

  getCreatedBy(): string {
    return this.createdBy;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }

  updateName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new Error('School name cannot be empty');
    }
    this.name = name;
    this.updatedAt = new Date();
  }

  updateStatus(status: SchoolStatus): void {
    this.status = status;
    this.updatedAt = new Date();
  }

  assignMainAdministrator(administratorId: string): void {
    this.mainAdministratorId = administratorId;
    this.updatedAt = new Date();
  }

  removeMainAdministrator(): void {
    this.mainAdministratorId = null;
    this.updatedAt = new Date();
  }
}
