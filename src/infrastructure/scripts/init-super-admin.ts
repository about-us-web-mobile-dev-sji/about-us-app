import { NestFactory } from '@nestjs/core';
import { randomUUID } from 'crypto';
import { AppModule } from '../../app.module.js';
import { UserRepository } from '../../user/domain/repositories/UserRepository.js';
import { PasswordHasher } from '../../auth/application/gateways/PasswordHasher.js';
import { User } from '../../user/domain/entities/User.js';
import { Email } from '../../shared/domain/value-objects/Email.js';
import { Role } from '../../shared/domain/enums/Role.js';

async function initSuperAdmin() {
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const userRepository = app.get<UserRepository>(UserRepository);
    const passwordHasher = app.get<PasswordHasher>(PasswordHasher);

    const email = Email.create(process.env.SUPER_ADMIN_EMAIL || 'admin@example.com');

    // Check if super admin already exists
    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) {
      console.log('Super admin already exists');
      return;
    }

    // Hash password
    const passwordHash = await passwordHasher.hash(
      process.env.SUPER_ADMIN_PASSWORD || 'admin123',
    );

    // Create super admin user
    const superAdmin = new User(
      randomUUID(),
      email,
      process.env.SUPER_ADMIN_FIRST_NAME || 'Super',
      process.env.SUPER_ADMIN_LAST_NAME || 'Admin',
      passwordHash,
      [Role.SUPER_ADMIN],
      new Date(),
      new Date(),
    );

    await userRepository.save(superAdmin);

    console.log('Super admin created successfully');
    console.log(`Email: ${email.getValue()}`);
  } catch (error) {
    console.error('Error creating super admin:', error);
  } finally {
    await app.close();
  }
}

initSuperAdmin();
