import { IsNull, type Repository } from 'typeorm';
import type { UUID } from 'node:crypto';
import { Notification } from '../../domain/entities/notification.entity.js';
import type {
  NotificationListQuery,
  NotificationRepository,
} from '../../domain/repositories/i-notification.repository.js';
import { NotificationEntity } from './typeorm/notification.entity.js';
import { NotificationMapper } from './mappers/notification.mapper.js';

export class TypeormNotificationRepository implements NotificationRepository {
  constructor(private readonly repo: Repository<NotificationEntity>) {}

  async existsByRequestAndRecipient(
    requestId: string,
    recipientId: string,
  ): Promise<boolean> {
    const count = await this.repo.countBy({ requestId, recipientId });
    return count > 0;
  }

  async save(notification: Notification): Promise<Notification> {
    const saved = await this.repo.save(
      NotificationMapper.toPersistence(notification),
    );
    return NotificationMapper.toDomain(saved);
  }

  async findByIdForRecipient(
    id: UUID,
    recipientId: string,
  ): Promise<Notification | null> {
    const entity = await this.repo.findOneBy({ id, recipientId });
    return entity ? NotificationMapper.toDomain(entity) : null;
  }

  async findInbox(
    recipientId: string,
    query: NotificationListQuery,
  ): Promise<{ items: Notification[]; total: number }> {
    const qb = this.repo
      .createQueryBuilder('notification')
      .where('notification.recipient_id = :recipientId', { recipientId });

    if (query.read === true) qb.andWhere('notification.read_at IS NOT NULL');
    if (query.read === false) qb.andWhere('notification.read_at IS NULL');
    if (query.type) {
      qb.andWhere('notification.type = :type', { type: query.type });
    }

    const [entities, total] = await qb
      .orderBy('notification.created_at', 'DESC')
      .addOrderBy('notification.id', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();

    return {
      items: entities.map((entity) => NotificationMapper.toDomain(entity)),
      total,
    };
  }

  countUnread(recipientId: string): Promise<number> {
    return this.repo.countBy({ recipientId, readAt: IsNull() });
  }

  async markRead(recipientId: string, id?: UUID): Promise<boolean> {
    const qb = this.repo
      .createQueryBuilder()
      .update(NotificationEntity)
      .set({ readAt: () => 'COALESCE(read_at, NOW())' })
      .where('recipient_id = :recipientId', { recipientId });

    if (id) qb.andWhere('id = :id', { id });

    const result = await qb.execute();
    return (result.affected ?? 0) > 0;
  }
}
