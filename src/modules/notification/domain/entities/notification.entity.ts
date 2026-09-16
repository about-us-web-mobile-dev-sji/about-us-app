import type { UUID } from 'node:crypto';
import { NotificationType } from '../enums/notification-type.enum.js';
import { Severity } from '../enums/severity.enum.js';

export interface NotificationProps {
  id?: UUID;
  requestId: string;
  recipientId: string;
  organizationId: string | null;
  type: NotificationType;
  severity: Severity;
  title: string;
  message: string;
  payload: Record<string, unknown>;
  locale: string;
  createdAt: Date;
  readAt: Date | null;
}

export class Notification {
  private constructor(private props: NotificationProps) {}

  static create(input: Omit<NotificationProps, 'id' | 'readAt' | 'createdAt'> & {
    createdAt?: Date;
  }): Notification {
    return new Notification({
      ...input,
      id: undefined,
      createdAt: input.createdAt ?? new Date(),
      readAt: null,
    });
  }

  static reconstitute(props: NotificationProps): Notification {
    return new Notification(structuredClone(props));
  }

  get id(): UUID | undefined {
    return this.props.id;
  }

  get recipientId(): string {
    return this.props.recipientId;
  }

  get requestId(): string {
    return this.props.requestId;
  }

  get type(): NotificationType {
    return this.props.type;
  }

  get title(): string {
    return this.props.title;
  }

  get message(): string {
    return this.props.message;
  }

  get locale(): string {
    return this.props.locale;
  }

  get readAt(): Date | null {
    return this.props.readAt;
  }

  markAsRead(now = new Date()): void {
    this.props.readAt ??= now;
  }

  toPrimitives(): NotificationProps {
    return structuredClone(this.props);
  }
}

export function severityFor(type: NotificationType): Severity {
  return type === NotificationType.SECURITY_ALERT
    ? Severity.WARNING
    : Severity.INFO;
}
