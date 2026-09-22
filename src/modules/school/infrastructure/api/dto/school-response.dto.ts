import type { ListSchoolsOutput } from '../../../application/use-cases/queries/list-schools/ListSchoolsOutput.js';

export class SchoolResponseDto {
  id: string | undefined;
  name: string;

  static fromOutput(output: ListSchoolsOutput): SchoolResponseDto[] {
    return output.map((school) => ({
      id: school.id,
      name: school.name,
    }));
  }
}