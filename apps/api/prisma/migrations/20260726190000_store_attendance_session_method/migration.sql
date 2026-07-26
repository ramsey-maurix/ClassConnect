ALTER TABLE "AttendanceSession"
ADD COLUMN "method" "AttendanceMethod" NOT NULL DEFAULT 'PIN';

UPDATE "AttendanceSession"
SET "method" = 'QR'
WHERE "qrTokenHash" IS NOT NULL;
