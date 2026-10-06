import { Notification } from '../../../domain/entities/notification.entity.js';
import { NotificationEntity } from '../typeorm/notification.entity.js';

export class NotificationMapper {
  static toDomain(entity: NotificationEntity): Notification {
    return Notification.reconstitute({
      id: entity.id,
      requestId: entity.requestId,
      recipientId: entity.recipientId,
      organizationId: entity.organizationId,
      type: entity.type,
      severity: entity.severity,
      title: entity.title,
      message: entity.message,
      payload: entity.payload,
      locale: entity.locale,
      createdAt: entity.createdAt,
      readAt: entity.readAt,
    });
  }

  static toPersistence(notification: Notification): NotificationEntity {
    const primitives = notification.toPrimitives();
    const entity = new NotificationEntity();
    if (primitives.id) entity.id = primitives.id;
    entity.requestId = primitives.requestId;
    entity.recipientId = primitives.recipientId;
    entity.organizationId = primitives.organizationId;
    entity.type = primitives.type;
    entity.severity = primitives.severity;
    entity.title = primitives.title;
    entity.message = primitives.message;
    entity.payload = primitives.payload;
    entity.locale = primitives.locale;
    entity.createdAt = primitives.createdAt;
    entity.readAt = primitives.readAt;
    return entity;
  }
}
