import { MoreThan, Repository } from 'typeorm';
import { SchoolInvitationEntity } from './typeorm/school-invitation.entity.js';
import { SchoolInvitation } from '../../domain/entities/school-invitation.entity.js';
import { InvitationStatus } from '../../domain/enums/invitation-status.enum.js';
import type {
  SchoolInvitationFilters,
  SchoolInvitationRepository,
} from '../../domain/repositories/i-school-invitation.repository.js';
import type { PaginatedResult, PaginationParams } from '../../../../shared/domain/pagination.js';
import { SchoolInvitationMapper } from './mappers/school-invitation.mapper.js';

export class TypeormSchoolInvitationRepository
  implements SchoolInvitationRepository
{
  constructor(private readonly repo: Repository<SchoolInvitationEntity>) {}

  async findByTokenHash(tokenHash: string): Promise<SchoolInvitation | null> {
    const entity = await this.repo.findOneBy({ tokenHash });
    return entity ? SchoolInvitationMapper.toDomain(entity) : null;
  }

  async findById(id: string): Promise<SchoolInvitation | null> {
    const entity = await this.repo.findOneBy({ id });
    return entity ? SchoolInvitationMapper.toDomain(entity) : null;
  }

  async findBySchoolPaginated(
    schoolId: string,
    filters: SchoolInvitationFilters,
    pagination: PaginationParams,
    now: Date = new Date(),
  ): Promise<PaginatedResult<SchoolInvitation>> {
    const query = this.repo
      .createQueryBuilder('invitation')
      .where('invitation.schoolId = :schoolId', { schoolId });

    // EXPIRED is not stored: it is a PENDING invitation past its expiry.
    if (filters.status === 'EXPIRED') {
      query
        .andWhere('invitation.status = :status', { status: InvitationStatus.PENDING })
        .andWhere('invitation.expiresAt <= :now', { now: now.getTime() });
    } else if (filters.status === InvitationStatus.PENDING) {
      query
        .andWhere('invitation.status = :status', { status: InvitationStatus.PENDING })
        .andWhere('invitation.expiresAt > :now', { now: now.getTime() });
    } else if (filters.status) {
      query.andWhere('invitation.status = :status', { status: filters.status });
    }
    if (filters.search) {
      query.andWhere('invitation.email LIKE :search', {
        search: `%${filters.search.trim().toLowerCase()}%`,
      });
    }

    const [entities, total] = await query
      .orderBy('invitation.createdAt', 'DESC')
      .addOrderBy('invitation.id', 'ASC')
      .skip((pagination.page - 1) * pagination.limit)
      .take(pagination.limit)
      .getManyAndCount();

    return {
      items: entities.map((entity) => SchoolInvitationMapper.toDomain(entity)),
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil(total / pagination.limit),
    };
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

  async hasPendingForEmail(email: string): Promise<boolean> {
    return this.repo.existsBy({
      email: email.trim().toLowerCase(),
      status: InvitationStatus.PENDING,
      expiresAt: MoreThan(Date.now()),
    });
  }

  async save(invitation: SchoolInvitation): Promise<SchoolInvitation> {
    const entity = SchoolInvitationMapper.toPersistence(invitation);
    const saved = await this.repo.save(entity);
    return SchoolInvitationMapper.toDomain(saved);
  }
}
