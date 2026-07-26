import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import type { AssignStudentsDto } from "./dto/assign-students.dto";

@Injectable()
export class ClassAssignmentsService {
  constructor(private readonly prisma: PrismaService) {}

  classes() {
    return this.prisma.courseOffering.findMany({
      include: {
        course: true,
        period: true,
        lecturer: { select: { id: true, firstName: true, lastName: true, staffNumber: true } },
        students: {
          include: {
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                studentNumber: true,
                status: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        _count: { select: { students: true } },
      },
      orderBy: [{ period: { academicYear: "desc" } }, { course: { code: "asc" } }],
    });
  }

  async getClass(offeringId: string) {
    const offering = await this.prisma.courseOffering.findUnique({
      where: { id: offeringId },
      include: {
        course: true,
        period: true,
        lecturer: { select: { id: true, firstName: true, lastName: true, staffNumber: true } },
        students: {
          include: {
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                studentNumber: true,
                status: true,
              },
            },
          },
          orderBy: { student: { lastName: "asc" } },
        },
      },
    });
    if (!offering) throw new NotFoundException("Class not found");
    return offering;
  }

  async assign(offeringId: string, dto: AssignStudentsDto, actorId: string, ipAddress?: string) {
    const studentIds = [...new Set(dto.studentIds)];
    const [offering, students] = await Promise.all([
      this.prisma.courseOffering.findUnique({ where: { id: offeringId }, include: { course: true, period: true } }),
      this.prisma.user.findMany({ where: { id: { in: studentIds }, role: UserRole.STUDENT, status: "ACTIVE" } }),
    ]);
    if (!offering) throw new NotFoundException("Class not found");
    if (students.length !== studentIds.length) throw new BadRequestException("One or more selected accounts are not active students");

    await this.prisma.$transaction(async (tx) => {
      await tx.classStudent.createMany({
        data: studentIds.map((studentId) => ({ offeringId, studentId })),
        skipDuplicates: true,
      });
      // Keep course-level access available to existing attendance and grade modules.
      await tx.courseStudent.createMany({
        data: studentIds.map((studentId) => ({ courseId: offering.courseId, studentId })),
        skipDuplicates: true,
      });
      await tx.notification.createMany({
        data: studentIds.map((userId) => ({
          userId,
          type: "CLASS_ASSIGNMENT",
          title: "Added to class",
          message: `You were added to ${offering.course.code} for ${offering.period.academicYear} ${offering.period.semester === "SEMESTER_1" ? "Semester 1" : "Semester 2"}.`,
          relatedEntityId: offeringId,
        })),
      });
      await tx.auditLog.create({
        data: {
          actorUserId: actorId,
          action: "STUDENTS_ASSIGNED_TO_CLASS",
          entityType: "CourseOffering",
          entityId: offeringId,
          description: `${studentIds.length} student account(s) assigned to ${offering.course.code}`,
          newValue: { studentIds },
          ipAddress,
        },
      });
    });
    return this.getClass(offeringId);
  }

  async remove(offeringId: string, studentId: string, actorId: string, ipAddress?: string) {
    const assignment = await this.prisma.classStudent.findUnique({
      where: { offeringId_studentId: { offeringId, studentId } },
      include: { offering: { include: { course: true, period: true } } },
    });
    if (!assignment) throw new NotFoundException("Student is not assigned to this class");

    await this.prisma.$transaction(async (tx) => {
      await tx.classStudent.delete({ where: { offeringId_studentId: { offeringId, studentId } } });
      const otherClass = await tx.classStudent.findFirst({
        where: { studentId, offering: { courseId: assignment.offering.courseId } },
      });
      if (!otherClass) {
        await tx.courseStudent.deleteMany({ where: { courseId: assignment.offering.courseId, studentId } });
      }
      await tx.notification.create({
        data: {
          userId: studentId,
          type: "CLASS_ASSIGNMENT_REMOVED",
          title: "Removed from class",
          message: `You were removed from ${assignment.offering.course.code} for ${assignment.offering.period.academicYear}.`,
          relatedEntityId: offeringId,
        },
      });
      await tx.auditLog.create({
        data: {
          actorUserId: actorId,
          action: "STUDENT_REMOVED_FROM_CLASS",
          entityType: "CourseOffering",
          entityId: offeringId,
          description: `Student removed from ${assignment.offering.course.code}`,
          previousValue: { studentId },
          ipAddress,
        },
      });
    });
    return { message: "Student removed from class" };
  }
}
