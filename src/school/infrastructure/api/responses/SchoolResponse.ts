import { SchoolStatus } from '../../../domain/enums/SchoolStatus.js';
import { CreateSchoolOutput } from '../../../application/use-cases/commands/create-school/CreateSchoolOutput.js';
import { FindSchoolByIdOutput } from '../../../application/use-cases/queries/find-school-by-id/FindSchoolByIdOutput.js';

export class SchoolResponse {
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
    public readonly updatedAt?: Date,
  ) {}

  static fromCreateOutput(output: CreateSchoolOutput): SchoolResponse {
    return new SchoolResponse(
      output.id,
      output.identifier,
      output.name,
      output.description,
      output.address,
      output.city,
      output.postalCode,
      output.country,
      output.status,
      output.mainAdministratorId,
      output.createdBy,
      output.createdAt,
    );
  }

  static fromFindByIdOutput(output: FindSchoolByIdOutput): SchoolResponse {
    return new SchoolResponse(
      output.id,
      output.identifier,
      output.name,
      output.description,
      output.address,
      output.city,
      output.postalCode,
      output.country,
      output.status,
      output.mainAdministratorId,
      output.createdBy,
      output.createdAt,
      output.updatedAt,
    );
  }
}
