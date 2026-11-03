import type { ListSchoolsOutput } from '../../../../application/use-cases/queries/list-schools/list-schools.output.js';
import type { UserSummaries } from '../../../../../user/application/user-directory.js';
import { SchoolResponse } from './school.response.js';

/** Response of GET /schools: every visible school, in the same shape as a single one. */
export class SchoolResponseDto {
  static fromOutput(output: ListSchoolsOutput, users: UserSummaries): SchoolResponse[] {
    return output.schools.map((school) => SchoolResponse.fromOutput(school, users));
  }
}
