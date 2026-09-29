import type { ListSchoolsOutput } from '../../../application/use-cases/queries/list-schools/list-schools.output.js';

export class SchoolResponseDto {
  id: string | undefined;
  name: string;

  static fromOutput(output: ListSchoolsOutput): SchoolResponseDto[] {
    return output.schools.map((school) => ({
      id: school.id,
      name: school.name,
    }));
  }
}