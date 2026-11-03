import type { SchoolOutput } from '../../../../application/use-cases/school.output.js';
import { summaryOf, type UserSummaries, type UserSummary } from '../../../../../user/application/user-directory.js';

export class SchoolResponse {
  id!: string;
  name!: string;
  phoneNumber!: string | null;
  email!: string | null;
  website!: string | null;
  logo!: string | null;
  status!: string;
  createdAt!: Date;
  updatedAt!: Date;
  createdBy!: UserSummary;

  static fromOutput(output: SchoolOutput, users: UserSummaries): SchoolResponse {
    return {
      id: output.id,
      name: output.name,
      phoneNumber: output.phoneNumber,
      email: output.email,
      website: output.website,
      logo: output.logo,
      status: output.status,
      createdAt: output.createdAt,
      updatedAt: output.updatedAt,
      createdBy: summaryOf(users, output.createdBy),
    };
  }
}
