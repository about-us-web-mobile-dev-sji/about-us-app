export interface LogoutInput {
  accessToken?: string;
  refreshToken?: string;
  clientType?: 'WEB' | 'MOBILE';
}
