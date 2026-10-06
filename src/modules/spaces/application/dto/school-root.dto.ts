import type { UUID } from 'node:crypto';

export interface EnsureSchoolRootInput {
  schoolId: UUID;
  name: string;
}

export interface EnsureSchoolRootOutput {
  id: UUID;
  schoolId: UUID;
  name: string;
  path: string;
  depth: number;
  kind: string;
  isNew: boolean;
}