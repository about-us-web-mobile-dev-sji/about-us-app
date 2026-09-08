import { DatabaseModule } from '../../shared/infrastructure/database/database.module.js';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TypeormAuthIdentityRepository } from './infrastructure/persistence/typeorm-auth-identity.repository.js';
import { TypeormSessionRepository } from './infrastructure/persistence/typeorm-session.repository.js';
import { AuthIdentityEntity } from './infrastructure/persistence/typeorm/auth-identity.entity.js';
import { AuthSessionEntity } from './infrastructure/persistence/typeorm/auth-session.entity.js';
import { SuperAdminCreatedListener } from './infrastructure/events/super-admin-created.listener.js';
import { CreateSuperAdminIdentityUseCase } from './application/use-cases/commands/create-super-admin-identity/CreateSuperAdminIdentity.js';
import { EmailLoginUseCase } from './application/use-cases/commands/email-login/EmailLogin.js';
import { APP_FILTER } from '@nestjs/core';
import { AuthApplicationExceptionFilter } from './infrastructure/http/auth-application-exception.filter.js';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import googleConfig from '../../config/google.config.js';
import authConfig from '../../config/auth.config.js';
import { UserModule } from '../user-off/user.module.js';
import { UserAccountService } from '../user-off/application/user-account.service.js';
import { GoogleLoginUseCase } from './application/use-cases/commands/google-login/GoogleLogin.js';
import { RefreshTokenUseCase } from './application/use-cases/commands/refresh-token/RefreshToken.js';
import { AuthenticateUseCase } from './application/use-cases/queries/authenticate/Authenticate.js';
import { LogoutUseCase } from './application/use-cases/commands/logout/Logout.js';
import { SessionValidator } from './application/services/session-validator.service.js';
import { AccessTokenIssuer } from './application/services/access-token-issuer.service.js';
import {
  AUTH_SUBJECT,
  type AuthSubjectGateway,
} from './application/gateways/i-auth-subject.gateway.js';
import {
  ACCESS_TOKEN_SERVICE,
  type AccessTokenGateway,
} from './application/gateways/i-access-token.gateway.js';
import {
  REFRESH_TOKEN_SERVICE,
  type RefreshTokenGateway,
} from './application/gateways/i-refresh-token.gateway.js';
import {
  PASSWORD_ENCRYPTION,
  type PasswordEncryptionGateway,
} from './application/gateways/i-password-encryption.gateway.js';
import {
  AUTH_IDENTITY_REPOSITORY,
  type AuthIdentityRepository,
} from './domain/repositories/auth-identity.repositories.js';
import {
  SESSION_REPOSITORY,
  type SessionRepository,
} from './domain/repositories/session.repositories.js';
// sqlite adapters removed — using TypeORM-backed repositories
import { UserAuthSubjectGateway } from './infrastructure/services/user-auth-subject.gateway.js';
import {
  NestJwtService,
  NestRefreshJwtService,
} from './infrastructure/services/jwt.services.js';
import { BCryptPasswordEncryptionGateway } from './infrastructure/services/bcrypt-password-encryption.gateway.js';
import { GoogleStrategy } from './infrastructure/services/google.strategy.js';
import { GoogleAuthGuard } from './infrastructure/services/google-auth-guard.services.js';
import { AuthController } from './infrastructure/http/auth.controller.js';

@Module({
  imports: [
    DatabaseModule,
    TypeOrmModule.forFeature([AuthIdentityEntity, AuthSessionEntity]),
    UserModule,
    ConfigModule.forFeature(googleConfig),
    ConfigModule.forFeature(authConfig),
    PassportModule.register({ session: false }),
    JwtModule.registerAsync({
      imports: [ConfigModule.forFeature(authConfig)],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.getOrThrow<string>('auth.secret');
        if (Buffer.byteLength(secret) < 32)
          throw new Error('JWT_SECRET must contain at least 32 bytes');
        return {
          secret,
          signOptions: { algorithm: 'HS256' as const },
          verifyOptions: {
            algorithms: ['HS256' as const],
            issuer: config.getOrThrow<string>('auth.issuer'),
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  exports: [
    EmailLoginUseCase,
    GoogleLoginUseCase,
    RefreshTokenUseCase,
    AuthenticateUseCase,
    LogoutUseCase,
  ],
  providers: [
    {
      provide: CreateSuperAdminIdentityUseCase,
      inject: [AUTH_IDENTITY_REPOSITORY, PASSWORD_ENCRYPTION],
      useFactory: (
        identities: AuthIdentityRepository,
        passwords: PasswordEncryptionGateway,
      ) => new CreateSuperAdminIdentityUseCase(identities, passwords),
    },
    SuperAdminCreatedListener,
    {
      provide: EmailLoginUseCase,
      inject: [
        AUTH_IDENTITY_REPOSITORY,
        PASSWORD_ENCRYPTION,
        AUTH_SUBJECT,
        SESSION_REPOSITORY,
        AccessTokenIssuer,
        REFRESH_TOKEN_SERVICE,
        ConfigService,
      ],
      useFactory: (
        identities: AuthIdentityRepository,
        passwords: PasswordEncryptionGateway,
        subjects: AuthSubjectGateway,
        sessions: SessionRepository,
        issuer: AccessTokenIssuer,
        refresh: RefreshTokenGateway,
        config: ConfigService,
      ) =>
        new EmailLoginUseCase(
          identities,
          passwords,
          subjects,
          sessions,
          issuer,
          refresh,
          {
            issuer: config.getOrThrow<string>('auth.issuer'),
            sessionTtlSeconds: config.getOrThrow<number>(
              'auth.sessionTtlSeconds',
            ),
          },
        ),
    },
    { provide: APP_FILTER, useClass: AuthApplicationExceptionFilter },
    GoogleAuthGuard,
    {
      provide: GoogleStrategy,
      useFactory: (config: ConfigService) => new GoogleStrategy(config),
      inject: [ConfigService],
    },
    {
      provide: AUTH_SUBJECT,
      useFactory: (users: UserAccountService) =>
        new UserAuthSubjectGateway(users),
      inject: [UserAccountService],
    },
    {
      provide: AUTH_IDENTITY_REPOSITORY,
      useFactory: (repo: Repository<AuthIdentityEntity>) =>
        new TypeormAuthIdentityRepository(repo),
      inject: [getRepositoryToken(AuthIdentityEntity)],
    },
    {
      provide: SESSION_REPOSITORY,
      useFactory: (repo: Repository<AuthSessionEntity>) =>
        new TypeormSessionRepository(repo),
      inject: [getRepositoryToken(AuthSessionEntity)],
    },
    {
      provide: ACCESS_TOKEN_SERVICE,
      useFactory: (jwt: JwtService) => new NestJwtService(jwt),
      inject: [JwtService],
    },
    {
      provide: REFRESH_TOKEN_SERVICE,
      useFactory: (jwt: JwtService) => new NestRefreshJwtService(jwt),
      inject: [JwtService],
    },
    { provide: PASSWORD_ENCRYPTION, useClass: BCryptPasswordEncryptionGateway },
    {
      provide: SessionValidator,
      inject: [AUTH_SUBJECT, AUTH_IDENTITY_REPOSITORY, SESSION_REPOSITORY],
      useFactory: (
        subjects: AuthSubjectGateway,
        identities: AuthIdentityRepository,
        sessions: SessionRepository,
      ) => new SessionValidator(subjects, identities, sessions),
    },
    {
      provide: AccessTokenIssuer,
      inject: [ACCESS_TOKEN_SERVICE, ConfigService],
      useFactory: (access: AccessTokenGateway, config: ConfigService) =>
        new AccessTokenIssuer(access, {
          issuer: config.getOrThrow<string>('auth.issuer'),
          accessTtlSeconds: config.getOrThrow<number>('auth.accessTtlSeconds'),
        }),
    },
    {
      provide: GoogleLoginUseCase,
      inject: [
        AUTH_SUBJECT,
        AUTH_IDENTITY_REPOSITORY,
        SESSION_REPOSITORY,
        AccessTokenIssuer,
        REFRESH_TOKEN_SERVICE,
        ConfigService,
      ],
      useFactory: (
        subjects: AuthSubjectGateway,
        identities: AuthIdentityRepository,
        sessions: SessionRepository,
        accessTokens: AccessTokenIssuer,
        refresh: RefreshTokenGateway,
        config: ConfigService,
      ) =>
        new GoogleLoginUseCase(
          subjects,
          identities,
          sessions,
          accessTokens,
          refresh,
          {
            issuer: config.getOrThrow<string>('auth.issuer'),
            sessionTtlSeconds: config.getOrThrow<number>(
              'auth.sessionTtlSeconds',
            ),
          },
        ),
    },
    {
      provide: RefreshTokenUseCase,
      inject: [
        REFRESH_TOKEN_SERVICE,
        SessionValidator,
        SESSION_REPOSITORY,
        AccessTokenIssuer,
      ],
      useFactory: (
        refresh: RefreshTokenGateway,
        validator: SessionValidator,
        sessions: SessionRepository,
        issuer: AccessTokenIssuer,
      ) => new RefreshTokenUseCase(refresh, validator, sessions, issuer),
    },
    {
      provide: AuthenticateUseCase,
      inject: [ACCESS_TOKEN_SERVICE, SessionValidator],
      useFactory: (access: AccessTokenGateway, validator: SessionValidator) =>
        new AuthenticateUseCase(access, validator),
    },
    {
      provide: LogoutUseCase,
      inject: [ACCESS_TOKEN_SERVICE, SessionValidator, SESSION_REPOSITORY],
      useFactory: (
        access: AccessTokenGateway,
        validator: SessionValidator,
        sessions: SessionRepository,
      ) => new LogoutUseCase(access, validator, sessions),
    },
  ],
})
export class AuthModule {}
