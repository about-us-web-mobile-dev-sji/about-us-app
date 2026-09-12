import { School } from '../../../../domain/entities/School.js';
import { SchoolStatus } from '../../../../domain/enums/SchoolStatus.js';

export class SchoolDto {
  constructor(
    public readonly id: string,
    public readonly identifier: string,
    public readonly name: string,
    public readonly city: string,
    public readonly status: SchoolStatus,
    public readonly createdAt: Date,
  ) {}

  static fromDomain(school: School): SchoolDto {
    return new SchoolDto(
      school.getId(),
      school.getIdentifier(),
      school.getName(),
      school.getCity(),
      school.getStatus(),
      school.getCreatedAt(),
    );
  }
}

export class ListSchoolsOutput {
  constructor(public readonly schools: SchoolDto[]) {}

  static fromDomain(schools: School[]): ListSchoolsOutput {
    return new ListSchoolsOutput(schools.map((school) => SchoolDto.fromDomain(school)));
  }
}
