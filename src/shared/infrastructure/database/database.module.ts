import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SqliteDatabase } from './sqlite.database.js';
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: SqliteDatabase,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new SqliteDatabase(
          config.get<string>('DATABASE_PATH') ?? './data/about-us.sqlite',
        ),
    },
  ],
  exports: [SqliteDatabase],
})
export class DatabaseModule {}
