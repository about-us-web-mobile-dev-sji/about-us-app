export interface ActiveSessionOutput {
  id: string;
  clientType: 'WEB' | 'MOBILE';
  userAgent: string | null;
  createdAt: Date;
  lastActivityAt: Date;
  expiresAt: Date;
  current: boolean;
}

export type ListSessionsOutput = ActiveSessionOutput[];
