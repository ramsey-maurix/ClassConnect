import { BadRequestException, Injectable } from "@nestjs/common";
import { AttendanceMethod, AttendanceSessionStatus, AttendanceStatus, Prisma, Semester } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async generate(type: string, actorId: string, ipAddress?: string, filters: Record<string, string> = {}) {
    let columns: string[] = [];
    let rows: Array<Array<string | number | null>> = [];
    if (type === "attendance") {
      const startsAt: Prisma.DateTimeFilter = {};
      if (filters.from) startsAt.gte = new Date(`${filters.from}T00:00:00.000Z`);
      if (filters.to) startsAt.lte = new Date(`${filters.to}T23:59:59.999Z`);
      const records = await this.prisma.attendanceRecord.findMany({
        where: {
          ...(filters.attendanceStatus && Object.values(AttendanceStatus).includes(filters.attendanceStatus as AttendanceStatus)
            ? { status: filters.attendanceStatus as AttendanceStatus } : {}),
          session: {
            ...(filters.courseId ? { courseId: filters.courseId } : {}),
            ...(filters.lecturerId ? { lecturerId: filters.lecturerId } : {}),
            ...(filters.sessionStatus && Object.values(AttendanceSessionStatus).includes(filters.sessionStatus as AttendanceSessionStatus) ? { status: filters.sessionStatus as AttendanceSessionStatus } : {}),
            ...(filters.method && Object.values(AttendanceMethod).includes(filters.method as AttendanceMethod) ? { method: filters.method as AttendanceMethod } : {}),
            ...(Object.keys(startsAt).length ? { startsAt } : {}),
            course: {
              ...(filters.programmeId ? { programmes: { some: { programmeId: filters.programmeId } } } : {}),
              ...(filters.academicYear || filters.semester ? { offerings: { some: { period: {
                ...(filters.academicYear ? { academicYear: filters.academicYear } : {}),
                ...(filters.semester && Object.values(Semester).includes(filters.semester as Semester) ? { semester: filters.semester as Semester } : {}),
              } } } } : {}),
            },
          },
        },
        include: {
          student: { include: { programme: true } },
          session: {
            include: {
              lecturer: true,
              course: {
                include: {
                  programmes: { include: { programme: true } },
                  offerings: { include: { period: true }, orderBy: { createdAt: "desc" }, take: 1 },
                },
              },
            },
          },
        },
        orderBy: { markedAt: "desc" },
      });
      columns = ["Student ID", "Student", "Programme / Class", "Course", "Lecturer", "Academic Period", "Session Date", "Session Status", "Attendance Status", "Method", "Distance (m)", "Marked at"];
      rows = records.map((item) => {
        const period = item.session.course.offerings[0]?.period;
        return [
          item.student.studentNumber,
          `${item.student.firstName} ${item.student.lastName}`,
          item.student.programme?.name ?? (item.session.course.programmes.map(({ programme }) => programme.name).join("; ") || "Unassigned"),
          `${item.session.course.code} — ${item.session.course.title}`,
          `${item.session.lecturer.firstName} ${item.session.lecturer.lastName}`,
          period ? `${period.academicYear} ${period.semester.replace("_", " ")}` : "Not assigned",
          item.session.startsAt.toISOString(),
          item.session.status,
          item.status,
          item.method,
          item.distanceMetres,
          item.markedAt.toISOString(),
        ];
      });
    } else if (type === "grades") {
      const grades = await this.prisma.grade.findMany({ include: { student: true, assessment: { include: { course: true } } }, orderBy: { updatedAt: "desc" } });
      columns = ["Student ID", "Student", "Course", "Assessment", "Raw mark", "Percentage", "Status"];
      rows = grades.map((item) => [item.student.studentNumber, `${item.student.firstName} ${item.student.lastName}`, item.assessment.course.code, item.assessment.title, Number(item.rawMark), Number(item.percentage), item.status]);
    } else if (type === "risk") {
      const alerts = await this.prisma.riskAlert.findMany({ include: { student: true, course: true }, orderBy: { createdAt: "desc" } });
      columns = ["Student ID", "Student", "Course", "Risk level", "Reason", "Recommendation", "Status"];
      rows = alerts.map((item) => [item.student.studentNumber, `${item.student.firstName} ${item.student.lastName}`, item.course?.code ?? "Overall", item.riskLevel, item.reason, item.recommendation, item.status]);
    } else if (type === "course-performance") {
      const courses = await this.prisma.course.findMany({ include: { _count: { select: { students: true, assessments: true, attendanceSessions: true } }, programmes: { include: { programme: true } } }, orderBy: { code: "asc" } });
      columns = ["Course", "Title", "Students", "Assessments", "Attendance sessions", "Programmes", "Status"];
      rows = courses.map((item) => [item.code, item.title, item._count.students, item._count.assessments, item._count.attendanceSessions, item.programmes.map(({ programme }) => programme.code).join("; "), item.status]);
    } else {
      throw new BadRequestException("Unsupported report type");
    }
    await this.prisma.auditLog.create({
      data: { actorUserId: actorId, action: "REPORT_GENERATED", entityType: "Report", entityId: type, description: `${type} report generated with ${rows.length} rows`, ipAddress },
    });
    return { type, generatedAt: new Date(), columns, rows };
  }
}
