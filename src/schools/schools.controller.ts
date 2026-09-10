import { Controller, Patch, Param } from '@nestjs/common';

@Controller('schools')
export class SchoolsController {

  @Patch(':id/block')
  blockSchool(@Param('id') id: string) {
    return {
      message: `L'école avec l'ID ${id} a été bloquée avec succès.`,
      status: 'BLOCKED',
    };
  }

  @Patch(':id/unblock')
  unblockSchool(@Param('id') id: string) {
    return {
      message: `L'école avec l'ID ${id} a été débloquée avec succès.`,
      status: 'ACTIVE',
    };
  }
}