import type { ListSchoolsOutput } from '../../../application/use-cases/queries/list-schools/ListSchoolsOutput.js';

export class SchoolDetailDto {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  country: string | null;
  phoneNumber: string | null;
  email: string | null;
  website: string | null;
  status: string;
  adminUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;

  static fromSchools(schools: ListSchoolsOutput): SchoolDetailDto[] {
    return schools.map((school) => {
      const props = school.toPrimitives();
      return {
        id: props.id as string,
        name: props.name,
        address: props.address,
        city: props.city,
        postalCode: props.postalCode,
        country: props.country,
        phoneNumber: props.phoneNumber,
        email: props.email,
        website: props.website,
        status: props.status,
        adminUserId: props.adminUserId,
        createdAt: props.createdAt,
        updatedAt: props.updatedAt,
        createdBy: props.createdBy,
      };
    });
  }
}