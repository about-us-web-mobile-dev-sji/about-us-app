
export interface PasswordEncryptionGateway {
  encrypt(password: string): Promise<string>;
  compare(password: string, hashedPassword: string): Promise<boolean>;
}


export const PASSWORD_ENCRYPTION = Symbol('PASSWORD_ENCRYPTION');
