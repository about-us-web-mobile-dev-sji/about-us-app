import { Module } from '@nestjs/common';
import { SchoolsController } from './schools.controller.js';

@Module({
  controllers: [SchoolsController],
})
export class SchoolsModule {}