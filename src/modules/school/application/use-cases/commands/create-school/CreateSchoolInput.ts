export interface CreateSchoolInput {
  name: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  phoneNumber?: string;
  email?: string;
  website?: string;
  adminUserId?: string;
  createdBy: string;
}
