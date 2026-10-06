-- Additive PostgreSQL migration. Run with ON_ERROR_STOP, before enabling the module.
BEGIN;
CREATE SCHEMA IF NOT EXISTS notification;
CREATE TABLE IF NOT EXISTS notification.processed_requests (
 request_id uuid PRIMARY KEY, correlation_id uuid NOT NULL, processed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notification_request_correlation ON notification.processed_requests(correlation_id);
CREATE TABLE IF NOT EXISTS notification.notifications (
 id uuid PRIMARY KEY, request_id uuid NOT NULL, recipient_id uuid NOT NULL,
 organization_id uuid, type varchar(80) NOT NULL, severity varchar(20) NOT NULL,
 title text NOT NULL, message text NOT NULL, payload jsonb NOT NULL,
 locale varchar(2) NOT NULL, in_app boolean NOT NULL,
 created_at timestamptz NOT NULL, read_at timestamptz, expires_at timestamptz NOT NULL,
 UNIQUE(request_id, recipient_id), CHECK (octet_length(payload::text) <= 16384)
);
CREATE INDEX IF NOT EXISTS notification_recipient_date ON notification.notifications(recipient_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS notification_recipient_read ON notification.notifications(recipient_id, read_at);
CREATE TABLE IF NOT EXISTS notification.deliveries (
 id uuid PRIMARY KEY, notification_id uuid NOT NULL REFERENCES notification.notifications(id) ON DELETE CASCADE,
 channel varchar(10) NOT NULL CHECK (channel IN ('EMAIL', 'IN_APP')),
 status varchar(20) NOT NULL CHECK (status IN ('PENDING','PROCESSING','SENT','FAILED','DEAD_LETTER','CANCELLED')),
 attempt_count integer NOT NULL DEFAULT 0,
 provider_message_id text, failure_code varchar(80), failure_reason varchar(80),
 next_attempt_at timestamptz, last_attempt_at timestamptz, sent_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 lease_token uuid, lease_until timestamptz, email jsonb,
 UNIQUE(notification_id, channel)
);
CREATE INDEX IF NOT EXISTS notification_delivery_pending ON notification.deliveries(status, next_attempt_at);
CREATE TABLE IF NOT EXISTS notification.preferences (
 recipient_id uuid NOT NULL, notification_type varchar(80) NOT NULL,
 in_app_enabled boolean NOT NULL, email_enabled boolean NOT NULL, updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(recipient_id, notification_type),
 CHECK (notification_type <> 'SECURITY_ALERT' OR (in_app_enabled AND email_enabled))
);
CREATE TABLE IF NOT EXISTS notification.delivery_attempts (
 id uuid PRIMARY KEY, delivery_id uuid NOT NULL REFERENCES notification.deliveries(id) ON DELETE CASCADE,
 attempt integer NOT NULL, status varchar(30) NOT NULL, failure_code varchar(80), actor_id uuid,
 created_at timestamptz NOT NULL DEFAULT now()
);
COMMIT;
