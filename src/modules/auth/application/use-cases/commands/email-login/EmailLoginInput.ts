export interface EmailLoginInput {
  email: string;
  password: string;
  userAgent?: string;
  clientType?: 'WEB' | 'MOBILE';
}
