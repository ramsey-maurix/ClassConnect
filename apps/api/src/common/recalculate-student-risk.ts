import { AttendanceStatus, GradeStatus, RiskLevel, RiskStatus, StandingStatus } from "@prisma/client";
import type { PrismaService } from "../prisma/prisma.service";

export async function recalculateStudentRisk(prisma: PrismaService, studentId: string) {
  const [grades, attendance, existingAlert] = await Promise.all([
    prisma.grade.findMany({
      where: { studentId, status: { in: [GradeStatus.PUBLISHED, GradeStatus.CORRECTED] } },
      select: { percentage: true },
    }),
    prisma.attendanceRecord.groupBy({ by: ["status"], where: { studentId }, _count: true }),
    prisma.riskAlert.findFirst({ where: { studentId, courseId: null, status: RiskStatus.OPEN } }),
  ]);
  const average = grades.length ? grades.reduce((sum, grade) => sum + Number(grade.percentage), 0) / grades.length : 0;
  const currentGpa = grades.length ? Math.min(4, average / 25) : 0;
  const totalAttendance = attendance.reduce((sum, row) => sum + row._count, 0);
  const attended = attendance.filter((row) => row.status === AttendanceStatus.PRESENT || row.status === AttendanceStatus.LATE).reduce((sum, row) => sum + row._count, 0);
  const attendancePercentage = totalAttendance ? attended / totalAttendance * 100 : 0;
  const hasAcademicData = grades.length > 0 || totalAttendance > 0;
  const standing = !hasAcademicData
    ? StandingStatus.GOOD
    : currentGpa < 1.5 || attendancePercentage < 60
      ? StandingStatus.PROBATION
      : currentGpa < 2 || attendancePercentage < 75
        ? StandingStatus.WARNING
        : StandingStatus.GOOD;
  const reason = standing === StandingStatus.GOOD
    ? "GPA and attendance meet the current thresholds."
    : `Current GPA is ${currentGpa.toFixed(2)} and attendance is ${attendancePercentage.toFixed(1)}%.`;

  await prisma.academicStanding.upsert({
    where: { studentId },
    create: { studentId, currentGpa, attendancePercentage, status: standing, reason },
    update: { currentGpa, attendancePercentage, status: standing, reason, calculatedAt: new Date() },
  });

  if (standing === StandingStatus.GOOD) {
    if (existingAlert) await prisma.riskAlert.update({ where: { id: existingAlert.id }, data: { status: RiskStatus.RESOLVED, resolvedAt: new Date() } });
    return;
  }
  const riskLevel = standing === StandingStatus.PROBATION ? RiskLevel.HIGH : RiskLevel.MODERATE;
  const recommendation = attendancePercentage < 75
    ? "Attend upcoming sessions and contact your lecturer for support."
    : "Review recent assessments and contact your lecturer for academic support.";
  if (existingAlert?.riskLevel === riskLevel && existingAlert.reason === reason) return;
  if (existingAlert) await prisma.riskAlert.update({ where: { id: existingAlert.id }, data: { status: RiskStatus.RESOLVED, resolvedAt: new Date() } });
  const alert = await prisma.riskAlert.create({ data: { studentId, riskLevel, reason, recommendation } });
  await prisma.notification.create({
    data: {
      userId: studentId,
      type: "ACADEMIC_RISK_WARNING",
      title: riskLevel === RiskLevel.HIGH ? "High academic risk warning" : "Academic warning",
      message: `${reason} ${recommendation}`,
      relatedEntityId: alert.id,
    },
  });
}
