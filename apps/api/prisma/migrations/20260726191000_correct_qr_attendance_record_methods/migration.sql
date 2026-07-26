UPDATE "AttendanceRecord" AS record
SET "method" = 'QR'
FROM "AttendanceSession" AS session
WHERE record."sessionId" = session."id"
  AND session."method" = 'QR'
  AND record."method" = 'PIN';
