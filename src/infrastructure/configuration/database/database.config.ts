import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { UserPersistenceModel } from '../../../user/infrastructure/persistence/entities/UserPersistenceModel.js';
import { SchoolPersistenceModel } from '../../../school/infrastructure/persistence/entities/SchoolPersistenceModel.js';
import { AuditLogPersistenceModel } from '../../../audit/infrastructure/persistence/entities/AuditLogPersistenceModel.js';
import { SchoolMembershipPersistenceModel } from '../../../school-membership/infrastructure/persistence/entities/SchoolMembershipPersistenceModel.js';

export const databaseConfig = (): TypeOrmModuleOptions => ({
  type: (process.env.DATABASE_TYPE as 'postgres') || 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  username: process.env.DATABASE_USERNAME || 'postgres',
  password: process.env.DATABASE_PASSWORD || '',
  database: process.env.DATABASE_NAME || 'about_us',
  entities: [
    UserPersistenceModel,
    SchoolPersistenceModel,
    AuditLogPersistenceModel,
    SchoolMembershipPersistenceModel,
  ],
  synchronize: process.env.DATABASE_SYNCHRONIZE === 'true',
  logging: process.env.NODE_ENV === 'development',
});
