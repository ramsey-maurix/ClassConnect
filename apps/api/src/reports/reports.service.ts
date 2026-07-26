import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async generate(type: string, actorId: string, ipAddress?: string) {
    let columns: string[] = [];
    let rows: Array<Array<string | number | null>> = [];
    if (type === "attendance") {
      const records = await this.prisma.attendanceRecord.findMany({ include: { student: true, session: { include: { course: true } } }, orderBy: { markedAt: "desc" } });
      columns = ["Student ID", "Student", "Course", "Status", "Method", "Distance (m)", "Marked at"];
      rows = records.map((item) => [item.student.studentNumber, `${item.student.firstName} ${item.student.lastName}`, item.session.course.code, item.status, item.method, item.distanceMetres, item.markedAt.toISOString()]);
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
