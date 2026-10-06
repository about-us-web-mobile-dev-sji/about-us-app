ALTER TABLE event.event_logs
ADD COLUMN IF NOT EXISTS message text;

UPDATE event.event_logs
SET message = name
WHERE message IS NULL;

ALTER TABLE event.event_logs
ALTER COLUMN message SET NOT NULL;