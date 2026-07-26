import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { AssessmentStatus, GradeStatus, UserRole } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { recalculateStudentRisk } from "../common/recalculate-student-risk";
import type { CorrectGradeDto, CreateAssessmentDto, SaveGradesDto } from "./dto/grades.dto";

@Injectable()
export class GradesService {
  constructor(private readonly prisma: PrismaService) {}

  async createAssessment(dto: CreateAssessmentDto, lecturerId: string) {
    await this.assertLecturer(dto.courseId, lecturerId);
    const weight = await this.prisma.assessment.aggregate({ where: { courseId: dto.courseId }, _sum: { weight: true } });
    if (Number(weight._sum.weight ?? 0) + dto.weight > 100) {
      throw new BadRequestException("Total assessment weight cannot exceed 100%");
    }
    return this.prisma.assessment.create({ data: { ...dto, createdById: lecturerId } });
  }

  async deleteAssessment(id: string, lecturerId: string) {
    const assessment = await this.getForLecturer(id, lecturerId);
    if (assessment.status !== AssessmentStatus.DRAFT) {
      throw new BadRequestException("Only draft assessments can be deleted");
    }
    return this.prisma.$transaction(async (tx) => {
      await tx.assessment.delete({ where: { id } });
      await tx.auditLog.create({
        data: {
          actorUserId: lecturerId,
          action: "DRAFT_ASSESSMENT_DELETED",
          entityType: "Assessment",
          entityId: id,
          description: `${assessment.title} was deleted from ${assessment.course.code}`,
        },
      });
      return { message: "Draft assessment deleted" };
    });
  }

  listAssessments(courseId: string, userId: string, role: UserRole) {
    const where = role === UserRole.STUDENT ? { courseId, status: AssessmentStatus.PUBLISHED } : { courseId };
    return this.assertAccess(courseId, userId, role).then(() =>
      this.prisma.assessment.findMany({ where, include: { _count: { select: { grades: true } } }, orderBy: { createdAt: "desc" } }),
    );
  }

  async saveDraft(assessmentId: string, dto: SaveGradesDto, lecturerId: string) {
    const assessment = await this.getForLecturer(assessmentId, lecturerId);
    if (assessment.status === AssessmentStatus.PUBLISHED) throw new BadRequestException("Published grades must be corrected individually with a reason");
    const members = await this.prisma.courseStudent.findMany({ where: { courseId: assessment.courseId }, select: { studentId: true } });
    const memberIds = new Set(members.map((item) => item.studentId));
    for (const entry of dto.grades) {
      if (!memberIds.has(entry.studentId)) throw new BadRequestException("A grade belongs to a student outside this course");
      if (entry.rawMark > Number(assessment.maximumMark)) throw new BadRequestException("A mark exceeds the assessment maximum");
    }
    await this.prisma.$transaction(
      dto.grades.map((entry) => {
        const percentage = entry.rawMark / Number(assessment.maximumMark) * 100;
        const weightedMark = percentage / 100 * Number(assessment.weight);
        return this.prisma.grade.upsert({
          where: { assessmentId_studentId: { assessmentId, studentId: entry.studentId } },
          create: { assessmentId, studentId: entry.studentId, rawMark: entry.rawMark, percentage, weightedMark, enteredById: lecturerId },
          update: { rawMark: entry.rawMark, percentage, weightedMark, enteredById: lecturerId },
        });
      }),
    );
    return { message: `${dto.grades.length} draft grade(s) saved` };
  }

  async publish(assessmentId: string, lecturerId: string) {
    const assessment = await this.getForLecturer(assessmentId, lecturerId);
    const grades = await this.prisma.grade.findMany({ where: { assessmentId } });
    if (!grades.length) throw new BadRequestException("Add draft grades before publishing");
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.assessment.update({ where: { id: assessmentId }, data: { status: AssessmentStatus.PUBLISHED, publishedAt: now } });
      await tx.grade.updateMany({ where: { assessmentId }, data: { status: GradeStatus.PUBLISHED, publishedAt: now } });
      await tx.notification.createMany({
        data: grades.map((grade) => ({
          userId: grade.studentId,
          type: "GRADE_PUBLISHED",
          title: "Grade published",
          message: `${assessment.course.code}: ${assessment.title}`,
          relatedEntityId: grade.id,
        })),
      });
      await tx.auditLog.create({
        data: {
          actorUserId: lecturerId,
          action: "GRADES_PUBLISHED",
          entityType: "Assessment",
          entityId: assessmentId,
          description: `${grades.length} grade(s) published for ${assessment.course.code}`,
        },
      });
    });
    await Promise.all([...new Set(grades.map((grade) => grade.studentId))].map((studentId) => recalculateStudentRisk(this.prisma, studentId)));
    return { message: `${grades.length} grade(s) published` };
  }

  myGrades(studentId: string) {
    return this.prisma.grade.findMany({
      where: { studentId, status: { in: [GradeStatus.PUBLISHED, GradeStatus.CORRECTED] } },
      include: { assessment: { include: { course: true } } },
      orderBy: { publishedAt: "desc" },
    });
  }

  async courseGrades(courseId: string, userId: string, role: UserRole) {
    await this.assertAccess(courseId, userId, role);
    return this.prisma.assessment.findMany({
      where: { courseId },
      include: {
        grades: {
          include: { student: { select: { id: true, firstName: true, lastName: true, studentNumber: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async correct(id: string, dto: CorrectGradeDto, actorId: string) {
    const grade = await this.prisma.grade.findUnique({ where: { id }, include: { assessment: true } });
    if (!grade) throw new NotFoundException("Grade not found");
    await this.assertLecturer(grade.assessment.courseId, actorId);
    if (dto.rawMark > Number(grade.assessment.maximumMark)) throw new BadRequestException("Mark exceeds the assessment maximum");
    const percentage = dto.rawMark / Number(grade.assessment.maximumMark) * 100;
    const weightedMark = percentage / 100 * Number(grade.assessment.weight);
    const updated = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.grade.update({ where: { id }, data: { rawMark: dto.rawMark, percentage, weightedMark, status: GradeStatus.CORRECTED } });
      await tx.gradeChangeLog.create({
        data: { gradeId: id, previousMark: grade.rawMark, newMark: dto.rawMark, reason: dto.reason, changedById: actorId },
      });
      await tx.auditLog.create({
        data: {
          actorUserId: actorId,
          action: "PUBLISHED_GRADE_CHANGED",
          entityType: "Grade",
          entityId: id,
          description: `Published mark changed from ${grade.rawMark} to ${dto.rawMark}`,
          reason: dto.reason,
        },
      });
      await tx.notification.create({
        data: {
          userId: grade.studentId,
          type: "GRADE_CHANGED",
          title: "Published grade corrected",
          message: `A published mark was corrected. Reason: ${dto.reason}`,
          relatedEntityId: id,
        },
      });
      return updated;
    });
    await recalculateStudentRisk(this.prisma, grade.studentId);
    return updated;
  }

  private async getForLecturer(id: string, lecturerId: string) {
    const assessment = await this.prisma.assessment.findUnique({ where: { id }, include: { course: true } });
    if (!assessment) throw new NotFoundException("Assessment not found");
    await this.assertLecturer(assessment.courseId, lecturerId);
    return assessment;
  }

  private async assertLecturer(courseId: string, lecturerId: string) {
    const assigned = await this.prisma.courseLecturer.findUnique({ where: { courseId_lecturerId: { courseId, lecturerId } } });
    if (!assigned) throw new ForbiddenException("You can only manage grades for an assigned course");
  }

  private async assertAccess(courseId: string, userId: string, role: UserRole) {
    if (role === UserRole.ADMIN) return;
    if (role === UserRole.LECTURER) return this.assertLecturer(courseId, userId);
    const member = await this.prisma.courseStudent.findUnique({ where: { courseId_studentId: { courseId, studentId: userId } } });
    if (!member) throw new ForbiddenException("You are not in this course");
  }
}
