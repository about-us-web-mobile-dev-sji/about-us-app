import type { UUID } from 'node:crypto';
import type { SchoolStatus } from '../../../../domain/enums/school-status.enum.js';

export interface CreateSchoolOutput {
  id: UUID;
  name: string;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  country: string | null;
  phoneNumber: string | null;
  email: string | null;
  website: string | null;
  status: SchoolStatus;
  adminUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}
