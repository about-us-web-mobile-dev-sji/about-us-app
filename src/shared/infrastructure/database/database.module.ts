import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, type TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSource, type DataSourceOptions } from 'typeorm';
import databaseConfig from '../../../config/data-base.config.js';
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule.forFeature(databaseConfig)],
      inject: [ConfigService],
      useFactory: (config: ConfigService): TypeOrmModuleOptions => ({
        type: 'postgres',
        host: config.getOrThrow<string>('database.host'),
        port: config.getOrThrow<number>('database.port'),
        username: config.getOrThrow<string>('database.username'),
        password: config.get<string>('database.password'),
        database: config.getOrThrow<string>('database.name'),
        synchronize: config.getOrThrow<boolean>('database.synchronize'),
        autoLoadEntities: true,
      }),
      dataSourceFactory: async (options) => {
        if (!options) throw new Error('Missing database configuration');
        const dataSource = new DataSource({
          ...options,
          synchronize: false,
        } as DataSourceOptions);
        try {
          await dataSource.initialize();
          // Create module schemas before synchronizing development entities.
          if (options.synchronize) {
            await dataSource.query('CREATE SCHEMA IF NOT EXISTS auth');
            await dataSource.query('CREATE SCHEMA IF NOT EXISTS "user"');
            await dataSource.synchronize();
          }
          return dataSource;
        } catch (error) {
          if (dataSource.isInitialized) await dataSource.destroy();
          throw error;
        }
      },
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
