import { Repository } from 'typeorm';
import { SchoolInvitationEntity } from './typeorm/school-invitation.entity.js';
import { SchoolInvitation } from '../../domain/entities/school-invitation.entity.js';
import { InvitationStatus } from '../../domain/enums/invitation-status.enum.js';
import type { SchoolInvitationRepository } from '../../domain/repositories/i-school-invitation.repository.js';
import { SchoolInvitationMapper } from './mappers/school-invitation.mapper.js';

export class TypeormSchoolInvitationRepository
  implements SchoolInvitationRepository
{
  constructor(private readonly repo: Repository<SchoolInvitationEntity>) {}

  async findByTokenHash(tokenHash: string): Promise<SchoolInvitation | null> {
    const entity = await this.repo.findOneBy({ tokenHash });
    return entity ? SchoolInvitationMapper.toDomain(entity) : null;
  }

  async findPendingBySchoolAndEmail(
    schoolId: string,
    email: string,
  ): Promise<SchoolInvitation[]> {
    const entities = await this.repo.findBy({
      schoolId,
      email: email.trim().toLowerCase(),
      status: InvitationStatus.PENDING,
    });
    return entities.map((entity) => SchoolInvitationMapper.toDomain(entity));
  }

  async save(invitation: SchoolInvitation): Promise<SchoolInvitation> {
    const entity = SchoolInvitationMapper.toPersistence(invitation);
    const saved = await this.repo.save(entity);
    return SchoolInvitationMapper.toDomain(saved);
  }
}
