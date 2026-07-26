import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, UserRole } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import type { AddStudentsDto, AssignLecturerDto, CreateCourseDto, UpdateCourseDto } from "./dto/course.dto";

@Injectable()
export class CoursesService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: string, role: UserRole) {
    const where =
      role === UserRole.STUDENT
        ? { students: { some: { studentId: userId } } }
        : role === UserRole.LECTURER
          ? { lecturers: { some: { lecturerId: userId } } }
          : {};
    return this.prisma.course.findMany({
      where,
      include: {
        _count: { select: { students: true, lecturers: true } },
        lecturers: { include: { lecturer: { select: { id: true, firstName: true, lastName: true, staffNumber: true } } } },
        offerings: {
          include: {
            period: true,
            lecturer: { select: { id: true, firstName: true, lastName: true, staffNumber: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        programmes: { include: { programme: true } },
      },
      orderBy: { code: "asc" },
    });
  }

  async get(id: string, userId: string, role: UserRole) {
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: {
        students: { include: { student: { select: {
          id: true,
          firstName: true,
          lastName: true,
          studentNumber: true,
          email: true,
          programme: { select: { name: true, code: true } },
          academicStanding: true,
          riskAlerts: { where: { status: "OPEN" }, select: { id: true, riskLevel: true, reason: true, recommendation: true } },
        } } } },
        lecturers: { include: { lecturer: { select: { id: true, firstName: true, lastName: true, staffNumber: true, email: true } } } },
        department: { include: { faculty: true } },
        programmes: { include: { programme: true } },
        offerings: {
          include: {
            period: true,
            lecturer: { select: { id: true, firstName: true, lastName: true, staffNumber: true } },
            _count: { select: { students: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });
    if (!course) throw new NotFoundException("Course not found");
    if (
      role === UserRole.STUDENT && !course.students.some((item) => item.studentId === userId) ||
      role === UserRole.LECTURER && !course.lecturers.some((item) => item.lecturerId === userId)
    ) {
      throw new ForbiddenException("You are not assigned to this course");
    }
    return course;
  }

  async create(dto: CreateCourseDto, actorId: string, ipAddress?: string) {
    const { academicYear, semester, lecturerId, status, programmeIds, ...courseData } = dto;
    if (!/^\d{4}\/\d{4}$/.test(academicYear)) {
      throw new BadRequestException("Academic year must use the format 2026/2027");
    }
    if (lecturerId) {
      const lecturer = await this.prisma.user.findUnique({ where: { id: lecturerId } });
      if (!lecturer || lecturer.role !== UserRole.LECTURER) {
        throw new BadRequestException("Select a valid lecturer");
      }
    }
    const programmes = await this.prisma.programme.findMany({
      where: { id: { in: [...new Set(programmeIds)] }, departmentId: courseData.departmentId, status: "ACTIVE" },
    });
    if (programmes.length !== new Set(programmeIds).size) {
      throw new BadRequestException("Select valid programmes from the course department");
    }
    try {
      return await this.prisma.$transaction(async (tx) => {
        const course = await tx.course.upsert({
          where: { code: courseData.code.toUpperCase() },
          create: { ...courseData, code: courseData.code.toUpperCase() },
          update: {
            title: courseData.title,
            description: courseData.description,
            creditHours: courseData.creditHours,
          },
        });
        const period = await tx.academicPeriod.upsert({
          where: { academicYear_semester: { academicYear, semester } },
          create: { academicYear, semester },
          update: {},
        });
        const offering = await tx.courseOffering.create({
          data: {
            courseId: course.id,
            periodId: period.id,
            lecturerId: lecturerId || null,
            status: status ?? "ACTIVE",
          },
          include: {
            course: true,
            period: true,
            lecturer: { select: { id: true, firstName: true, lastName: true, staffNumber: true } },
          },
        });
        await tx.courseProgramme.deleteMany({
          where: { courseId: course.id, programmeId: { notIn: programmeIds } },
        });
        await tx.courseProgramme.createMany({
          data: programmeIds.map((programmeId) => ({ courseId: course.id, programmeId })),
          skipDuplicates: true,
        });
        if (lecturerId) {
          await tx.courseLecturer.upsert({
            where: { courseId_lecturerId: { courseId: course.id, lecturerId } },
            create: { courseId: course.id, lecturerId },
            update: {},
          });
          await tx.notification.create({
            data: {
              userId: lecturerId,
              type: "COURSE_ASSIGNMENT",
              title: "Course assigned",
              message: `You have been assigned to ${course.code} for ${academicYear} ${semester === "SEMESTER_1" ? "Semester 1" : "Semester 2"}.`,
              relatedEntityId: offering.id,
            },
          });
        }
        await tx.auditLog.create({
          data: {
            actorUserId: actorId,
            action: "COURSE_CLASS_CREATED",
            entityType: "CourseOffering",
            entityId: offering.id,
            description: `${course.code} created for ${academicYear} ${semester}`,
            ipAddress,
          },
        });
        return offering;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new BadRequestException("This course already exists in the selected academic year and semester");
      }
      throw error;
    }
  }

  update(id: string, dto: UpdateCourseDto) {
    return this.prisma.course.update({ where: { id }, data: dto });
  }

  async assignLecturer(courseId: string, dto: AssignLecturerDto, actorId: string, ipAddress?: string) {
    const lecturer = await this.prisma.user.findUnique({ where: { id: dto.lecturerId } });
    if (!lecturer || lecturer.role !== UserRole.LECTURER) throw new BadRequestException("A valid lecturer is required");
    return this.prisma.$transaction(async (tx) => {
      const assignment = await tx.courseLecturer.upsert({
        where: { courseId_lecturerId: { courseId, lecturerId: dto.lecturerId } },
        create: { courseId, lecturerId: dto.lecturerId },
        update: {},
      });
      const course = await tx.course.findUniqueOrThrow({ where: { id: courseId } });
      await tx.notification.create({
        data: {
          userId: dto.lecturerId,
          type: "COURSE_ASSIGNMENT",
          title: "Course assigned",
          message: `You have been assigned to teach ${course.code} ${course.title}.`,
          relatedEntityId: courseId,
        },
      });
      await tx.auditLog.create({
        data: {
          actorUserId: actorId,
          action: "LECTURER_ASSIGNED",
          entityType: "Course",
          entityId: courseId,
          description: `${lecturer.firstName} ${lecturer.lastName} assigned to ${course.code}`,
          ipAddress,
        },
      });
      return assignment;
    });
  }

  async removeLecturer(courseId: string, lecturerId: string, actorId: string) {
    await this.prisma.$transaction([
      this.prisma.courseLecturer.delete({ where: { courseId_lecturerId: { courseId, lecturerId } } }),
      this.prisma.auditLog.create({
        data: {
          actorUserId: actorId,
          action: "LECTURER_REMOVED",
          entityType: "Course",
          entityId: courseId,
          description: "Lecturer removed from course",
        },
      }),
    ]);
  }

  async addStudents(courseId: string, dto: AddStudentsDto, actorId: string, ipAddress?: string) {
    const students = await this.prisma.user.findMany({
      where: { id: { in: dto.studentIds }, role: UserRole.STUDENT },
    });
    if (students.length !== new Set(dto.studentIds).size) throw new BadRequestException("One or more student IDs are invalid");
    const course = await this.prisma.course.findUniqueOrThrow({ where: { id: courseId } });
    await this.prisma.$transaction(async (tx) => {
      await tx.courseStudent.createMany({
        data: dto.studentIds.map((studentId) => ({ courseId, studentId })),
        skipDuplicates: true,
      });
      await tx.notification.createMany({
        data: dto.studentIds.map((userId) => ({
          userId,
          type: "COURSE_ASSIGNMENT",
          title: "Added to course",
          message: `You have been added to ${course.code} ${course.title}.`,
          relatedEntityId: courseId,
        })),
      });
      await tx.auditLog.create({
        data: {
          actorUserId: actorId,
          action: "STUDENTS_ADDED_TO_COURSE",
          entityType: "Course",
          entityId: courseId,
          description: `${dto.studentIds.length} student account(s) added to ${course.code}`,
          newValue: { studentIds: dto.studentIds },
          ipAddress,
        },
      });
    });
    return this.get(courseId, actorId, UserRole.ADMIN);
  }

  async removeStudent(courseId: string, studentId: string, actorId: string) {
    await this.prisma.$transaction([
      this.prisma.courseStudent.delete({ where: { courseId_studentId: { courseId, studentId } } }),
      this.prisma.auditLog.create({
        data: {
          actorUserId: actorId,
          action: "STUDENT_REMOVED_FROM_COURSE",
          entityType: "Course",
          entityId: courseId,
          description: "Student account removed from course",
          previousValue: { studentId },
        },
      }),
    ]);
  }
}
