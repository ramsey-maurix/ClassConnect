ALTER TABLE "AttendanceSession"
ADD COLUMN "qrRotatedAt" TIMESTAMP(3);

UPDATE "AttendanceSession"
SET "qrRotatedAt" = COALESCE("updatedAt", "startsAt")
WHERE "method" = 'QR';
