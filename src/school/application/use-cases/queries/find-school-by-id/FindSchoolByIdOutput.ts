import { School } from '../../../../domain/entities/School.js';
import { SchoolStatus } from '../../../../domain/enums/SchoolStatus.js';

export class FindSchoolByIdOutput {
  constructor(
    public readonly id: string,
    public readonly identifier: string,
    public readonly name: string,
    public readonly description: string,
    public readonly address: string,
    public readonly city: string,
    public readonly postalCode: string,
    public readonly country: string,
    public readonly status: SchoolStatus,
    public readonly mainAdministratorId: string | null,
    public readonly createdBy: string,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  static fromDomain(school: School): FindSchoolByIdOutput {
    return new FindSchoolByIdOutput(
      school.getId(),
      school.getIdentifier(),
      school.getName(),
      school.getDescription(),
      school.getAddress(),
      school.getCity(),
      school.getPostalCode(),
      school.getCountry(),
      school.getStatus(),
      school.getMainAdministratorId(),
      school.getCreatedBy(),
      school.getCreatedAt(),
      school.getUpdatedAt(),
    );
  }
}
