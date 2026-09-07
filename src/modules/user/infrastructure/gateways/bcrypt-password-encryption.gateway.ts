
import bcrypt from 'bcrypt';
import { PasswordEncryptionGateway } from '../../application/gateways/i-password-encryption.gateway.js';

    
export class BCryptPasswordEncryptionGateway implements PasswordEncryptionGateway {

  async encrypt(password: string): Promise<string> {
    const salt: string= await bcrypt.genSalt();
    const hash: string = await bcrypt.hash(password, salt);
    return hash;
  }

  async compare(password: string, hashedPassword: string): Promise<boolean> {
    const isMatch: boolean = await bcrypt.compare(password, hashedPassword); 
    return isMatch;
  }
  
}