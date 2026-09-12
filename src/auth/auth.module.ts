import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UserModule } from '../user/user.module.js';
import { JwtStrategy } from './infrastructure/strategies/JwtStrategy.js';
import { JwtAuthGuard } from './infrastructure/guards/JwtAuthGuard.js';
import { RolesGuard } from './infrastructure/guards/RolesGuard.js';
import { BcryptPasswordHasher } from './infrastructure/services/BcryptPasswordHasher.js';
import { PasswordHasher } from './application/gateways/PasswordHasher.js';

@Module({
  imports: [
    UserModule,
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: {
        expiresIn: '24h',
        issuer: process.env.JWT_ISSUER || 'about-us',
      },
    }),
  ],
  providers: [
    JwtStrategy,
    JwtAuthGuard,
    RolesGuard,
    {
      provide: PasswordHasher,
      useClass: BcryptPasswordHasher,
    },
  ],
  exports: [JwtModule, JwtAuthGuard, RolesGuard, PasswordHasher],
})
export class AuthModule {}
