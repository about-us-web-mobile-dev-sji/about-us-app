import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventLog } from '../../domain/entities/event-log.js';
import type { EventLogRepository } from '../../domain/repositories/event-log.repository.js';
import { EventLogEntity } from './typeorm/event-log.entity.js';
import type { UUID } from 'node:crypto';
import {
  EventLogPersistenceMapper,
} from './mappers/event-log.persistence.mapper.js';
import type {
  EventLogFilters,
  EventLogPagination,
  PaginatedEventLogs,
} from '../../domain/repositories/event-log.repository.js';

@Injectable()
export class TypeormEventLogRepository implements EventLogRepository {
  constructor(
    @InjectRepository(EventLogEntity)
    private readonly repository: Repository<EventLogEntity>,
  ) {}

  async save(eventLog: EventLog): Promise<void> {
    await this.repository.save(EventLogPersistenceMapper.toEntity(eventLog));
  }

  async findById(id: string): Promise<EventLog | null> {
    const row = await this.repository.findOne({ where: { id } });
    return row ? EventLogPersistenceMapper.toDomain(row) : null;
  }

  async findAll(
    filters: EventLogFilters,
    pagination: EventLogPagination,
  ): Promise<PaginatedEventLogs> {
    const query = this.repository.createQueryBuilder('eventLog');

    if (filters.entityType)
      query.andWhere('eventLog.entityType = :entityType', {
        entityType: filters.entityType,
      });
    if (filters.search) {
      query.andWhere(
        '(eventLog.name ILIKE :search OR eventLog.entityType ILIKE :search OR eventLog.entityId ILIKE :search OR COALESCE(eventLog.actorId, \'\') ILIKE :search OR CAST(eventLog.payload AS text) ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    const [rows, total] = await query
      .orderBy('eventLog.occurredAt', 'DESC')
      .skip((pagination.page - 1) * pagination.limit)
      .take(pagination.limit)
      .getManyAndCount();

    return {
      items: rows.map((row) => EventLogPersistenceMapper.toDomain(row)),
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil(total / pagination.limit),
    };
  }

  async findByAggregate(
    entityType: string,
    entityId: UUID,
  ): Promise<EventLog[]> {
    const rows = await this.repository.find({
      where: { entityType, entityId },
      order: { occurredAt: 'ASC' },
    });

    return rows.map((row) => EventLogPersistenceMapper.toDomain(row));
  }
}