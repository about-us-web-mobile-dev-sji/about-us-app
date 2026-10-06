export interface UpdateSchoolInput {
  schoolId: string;
  name?: string;
  phoneNumber?: string | null;
  email?: string | null;
  website?: string | null;
}