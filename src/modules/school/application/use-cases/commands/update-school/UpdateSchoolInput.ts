export interface UpdateSchoolInput {
  schoolId: string;
  name?: string;
  address?: string | null;
  city?: string | null;
  postalCode?: string | null;
  country?: string | null;
  phoneNumber?: string | null;
  email?: string | null;
  website?: string | null;
}