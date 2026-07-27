import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { AttendanceStatus, GradeStatus, Prisma, RiskStatus, UserRole } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class SystemService {
  constructor(private readonly prisma: PrismaService) {}

  notifications(userId: string) {
    return this.prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 100 });
  }

  readAll(userId: string) {
    return this.prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
  }

  async readNotification(id: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({ where: { id } });
    if (!notification) throw new NotFoundException("Notification not found");
    if (notification.userId !== userId) throw new ForbiddenException();
    return this.prisma.notification.update({ where: { id }, data: { readAt: new Date() } });
  }

  deleteAllNotifications(userId: string) {
    return this.prisma.notification.deleteMany({ where: { userId } });
  }

  async studentAnalytics(studentId: string) {
    const [standing, risks, grades, attendance] = await Promise.all([
      this.prisma.academicStanding.findUnique({ where: { studentId } }),
      this.prisma.riskAlert.findMany({ where: { studentId, status: RiskStatus.OPEN }, include: { course: true } }),
      this.prisma.grade.findMany({
        where: { studentId, status: { in: [GradeStatus.PUBLISHED, GradeStatus.CORRECTED] } },
        include: { assessment: { include: { course: true } } },
      }),
      this.prisma.attendanceRecord.groupBy({ by: ["status"], where: { studentId }, _count: true }),
    ]);
    return { standing, risks, grades, attendance };
  }

  async courseAnalytics(courseId: string, userId: string, role: UserRole) {
    if (role === UserRole.LECTURER) {
      const assignment = await this.prisma.courseLecturer.findUnique({ where: { courseId_lecturerId: { courseId, lecturerId: userId } } });
      if (!assignment) throw new ForbiddenException("You are not assigned to this course");
    }
    const [course, grades, attendance] = await Promise.all([
      this.prisma.course.findUniqueOrThrow({ where: { id: courseId }, include: { _count: { select: { students: true } } } }),
      this.prisma.grade.aggregate({
        where: { assessment: { courseId }, status: { in: [GradeStatus.PUBLISHED, GradeStatus.CORRECTED] } },
        _avg: { percentage: true },
        _min: { percentage: true },
        _max: { percentage: true },
      }),
      this.prisma.attendanceRecord.groupBy({ by: ["status"], where: { session: { courseId } }, _count: true }),
    ]);
    return { course, grades, attendance };
  }

  async adminAnalytics() {
    const [students, lecturers, courses, atRisk, attendance, gradeRecords, risks] = await Promise.all([
      this.prisma.user.count({ where: { role: UserRole.STUDENT } }),
      this.prisma.user.count({ where: { role: UserRole.LECTURER } }),
      this.prisma.course.count(),
      this.prisma.riskAlert.count({ where: { status: RiskStatus.OPEN } }),
      this.prisma.attendanceRecord.groupBy({ by: ["status"], _count: true }),
      this.prisma.grade.findMany({ where: { status: { in: [GradeStatus.PUBLISHED, GradeStatus.CORRECTED] } }, select: { percentage: true } }),
      this.prisma.riskAlert.groupBy({ by: ["riskLevel"], where: { status: RiskStatus.OPEN }, _count: true }),
    ]);
    const totalAttendance = attendance.reduce((sum, item) => sum + item._count, 0);
    const attendedStatuses = new Set<AttendanceStatus>([AttendanceStatus.PRESENT, AttendanceStatus.LATE]);
    const attended = attendance
      .filter((item) => attendedStatuses.has(item.status))
      .reduce((sum, item) => sum + item._count, 0);
    return {
      totalStudents: students,
      totalLecturers: lecturers,
      totalCourses: courses,
      atRiskStudents: atRisk,
      attendanceRate: totalAttendance ? attended / totalAttendance * 100 : 0,
      averageGrade: gradeRecords.length ? gradeRecords.reduce((sum, grade) => sum + Number(grade.percentage), 0) / gradeRecords.length : 0,
      attendanceDistribution: attendance.map((item) => ({ label: item.status, value: item._count })),
      riskDistribution: risks.map((item) => ({ label: item.riskLevel, value: item._count })),
      gradeDistribution: [
        { label: "A (80–100)", value: gradeRecords.filter((grade) => Number(grade.percentage) >= 80).length },
        { label: "B (70–79)", value: gradeRecords.filter((grade) => Number(grade.percentage) >= 70 && Number(grade.percentage) < 80).length },
        { label: "C (60–69)", value: gradeRecords.filter((grade) => Number(grade.percentage) >= 60 && Number(grade.percentage) < 70).length },
        { label: "D (50–59)", value: gradeRecords.filter((grade) => Number(grade.percentage) >= 50 && Number(grade.percentage) < 60).length },
        { label: "F (0–49)", value: gradeRecords.filter((grade) => Number(grade.percentage) < 50).length },
      ],
    };
  }

  audit(take: number) {
    return this.prisma.auditLog.findMany({
      include: { actor: { select: { firstName: true, lastName: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: Math.min(Math.max(take, 1), 500),
    });
  }

  settings() {
    return this.prisma.systemSetting.findMany({ orderBy: { key: "asc" } });
  }

  async updateSettings(settings: Record<string, unknown>, actorId: string) {
    await this.prisma.$transaction(async (tx) => {
      for (const [key, value] of Object.entries(settings)) {
        await tx.systemSetting.upsert({
          where: { key },
          create: { key, value: value as Prisma.InputJsonValue, updatedById: actorId },
          update: { value: value as Prisma.InputJsonValue, updatedById: actorId },
        });
      }
      await tx.auditLog.create({
        data: {
          actorUserId: actorId,
          action: "SETTINGS_CHANGED",
          entityType: "SystemSetting",
          description: `${Object.keys(settings).length} system setting(s) updated`,
          newValue: settings as Prisma.InputJsonObject,
        },
      });
    });
    return this.settings();
  }
}
