import type { SchoolOutput } from '../../../../application/use-cases/school.output.js';

interface SchoolFields {
  id: string;
  name: string;
  address: string | null;
  phoneNumber: string | null;
  email: string | null;
  website: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export class SchoolResponse {
  id!: string;
  name!: string;
  address!: string | null;
  phoneNumber!: string | null;
  email!: string | null;
  website!: string | null;
  status!: string;
  createdAt!: Date;
  updatedAt!: Date;
  createdBy!: string;

  private static fromFields(p: SchoolFields): SchoolResponse {
    return {
      id: p.id,
      name: p.name,
      address: p.address,
      phoneNumber: p.phoneNumber,
      email: p.email,
      website: p.website,
      status: p.status,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      createdBy: p.createdBy,
    };
  }

  static fromOutput(output: SchoolOutput): SchoolResponse {
    return SchoolResponse.fromFields(output);
  }
}
