import { User } from '../../../domain/entities/user.enity.js';
import { type UserRepository } from '../../../domain/repositories/i-user.repository.js';
import { ConfigService } from '@nestjs/config';
import { Injectable } from '@nestjs/common';

@Injectable()
export class CreateSuperAdminUseCase {
  constructor(
    private readonly configService: ConfigService,
    private readonly userRepository: UserRepository,
  ) {}

  async handle(): Promise<void> {
    if (!(await this.userRepository.superAdminExists())) {
      const newSUperAdmin = User.create({
        firstName: this.configService.get('super-admin').firstName,
        lastName: this.configService.get('super-admin').lastName,
        email: this.configService.get('super-admin').email,
      });
      await this.userRepository.save(newSUperAdmin);
    }
    return Promise.resolve();
  }
}
