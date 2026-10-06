import type { ListSchoolsOutput } from '../../../../application/use-cases/queries/list-schools/list-schools.output.js';
import type { SchoolStatus } from '../../../../domain/enums/school-status.enum.js';

export class SchoolResponseDto {
  id!: string;
  name!: string;
  phoneNumber!: string | null;
  email!: string | null;
  website!: string | null;
  status!: SchoolStatus;
  createdAt!: Date;
  updatedAt!: Date;
  createdBy!: string;

  static fromOutput(output: ListSchoolsOutput): SchoolResponseDto[] {
    return output.schools.map((school) => ({
      id: school.id,
      name: school.name,
      phoneNumber: school.phoneNumber,
      email: school.email,
      website: school.website,
      status: school.status,
      createdAt: school.createdAt,
      updatedAt: school.updatedAt,
      createdBy: school.createdBy,
    }));
  }
}
