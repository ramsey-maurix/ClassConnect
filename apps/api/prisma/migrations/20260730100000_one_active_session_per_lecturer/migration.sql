UPDATE "AttendanceSession"
SET
  "status" = 'EXPIRED',
  "pinCode" = NULL,
  "qrToken" = NULL
WHERE "status" = 'ACTIVE'
  AND "expiresAt" <= CURRENT_TIMESTAMP;

WITH ranked AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "lecturerId"
      ORDER BY "startsAt" DESC, "createdAt" DESC
    ) AS position
  FROM "AttendanceSession"
  WHERE "status" = 'ACTIVE'
)
UPDATE "AttendanceSession"
SET
  "status" = 'CANCELLED',
  "pinCode" = NULL,
  "qrToken" = NULL
WHERE "id" IN (
  SELECT "id"
  FROM ranked
  WHERE position > 1
);

CREATE UNIQUE INDEX "AttendanceSession_one_active_per_lecturer"
ON "AttendanceSession" ("lecturerId")
WHERE "status" = 'ACTIVE';
