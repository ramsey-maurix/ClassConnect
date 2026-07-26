import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { AttendanceMethod, AttendanceSessionStatus, AttendanceStatus, UserRole } from "@prisma/client";
import { compare, hash } from "bcryptjs";
import { createHash, randomBytes, randomInt } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";
import { recalculateStudentRisk } from "../common/recalculate-student-risk";
import type { CreateAttendanceSessionDto, MarkAttendanceDto, UpdateAttendanceRecordDto } from "./dto/attendance.dto";

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  async createSession(dto: CreateAttendanceSessionDto, lecturerId: string, ipAddress?: string) {
    if (dto.locationAccuracy > Math.max(100, dto.radiusMetres)) {
      throw new BadRequestException(
        `Lecturer location is only accurate to ${Math.round(dto.locationAccuracy)}m. Enable precise location or start the session from a GPS-enabled phone.`,
      );
    }
    const assignment = await this.prisma.courseLecturer.findUnique({
      where: { courseId_lecturerId: { courseId: dto.courseId, lecturerId } },
      include: { course: true },
    });
    if (!assignment) throw new ForbiddenException("You can only start attendance for an assigned course");
    const active = await this.prisma.attendanceSession.findFirst({
      where: { courseId: dto.courseId, status: AttendanceSessionStatus.ACTIVE, expiresAt: { gt: new Date() } },
    });
    if (active) throw new BadRequestException("This course already has an active attendance session");

    const pin = randomInt(1000, 10_000).toString();
    const qrToken = randomBytes(32).toString("base64url");
    const startsAt = new Date();
    const expiresAt = new Date(startsAt.getTime() + dto.durationMinutes * 60_000);
    const usePin = dto.method === AttendanceMethod.PIN;
    const useQr = dto.method === AttendanceMethod.QR;

    const session = await this.prisma.$transaction(async (tx) => {
      const created = await tx.attendanceSession.create({
        data: {
          courseId: dto.courseId,
          lecturerId,
          method: dto.method,
          pinHash: usePin ? await hash(pin, 10) : null,
          qrTokenHash: useQr ? this.digest(qrToken) : null,
          latitude: dto.latitude,
          longitude: dto.longitude,
          locationAccuracy: dto.locationAccuracy,
          radiusMetres: dto.radiusMetres,
          startsAt,
          expiresAt,
          lateAfterMinutes: dto.lateAfterMinutes,
        },
        include: { course: true },
      });
      await tx.auditLog.create({
        data: {
          actorUserId: lecturerId,
          action: "ATTENDANCE_SESSION_STARTED",
          entityType: "AttendanceSession",
          entityId: created.id,
          description: `Attendance started for ${assignment.course.code}`,
          ipAddress,
        },
      });
      return created;
    });
    return { ...session, pin: usePin ? pin : undefined, qrToken: useQr ? qrToken : undefined };
  }

  async active(userId: string, role: UserRole) {
    await this.expireSessions();
    const where =
      role === UserRole.STUDENT
        ? { course: { students: { some: { studentId: userId } } } }
        : role === UserRole.LECTURER
          ? { lecturerId: userId }
          : {};
    return this.prisma.attendanceSession.findMany({
      where: { ...where, status: AttendanceSessionStatus.ACTIVE, expiresAt: { gt: new Date() } },
      include: {
        course: true,
        records: {
          where: { studentId: userId },
          select: { id: true, status: true, method: true, markedAt: true, distanceMetres: true },
        },
        _count: { select: { records: true } },
      },
      orderBy: { startsAt: "desc" },
    });
  }

  async sessions(lecturerId: string) {
    await this.expireSessions();
    return this.prisma.attendanceSession.findMany({
      where: { lecturerId },
      include: {
        course: true,
        records: { select: { status: true } },
        _count: { select: { records: true } },
      },
      orderBy: { startsAt: "desc" },
      take: 100,
    });
  }

  async get(id: string, userId: string, role: UserRole) {
    await this.expireSessions();
    const session = await this.prisma.attendanceSession.findUnique({
      where: { id },
      include: { course: true, records: { include: { student: { select: { id: true, firstName: true, lastName: true, studentNumber: true } } } } },
    });
    if (!session) throw new NotFoundException("Attendance session not found");
    await this.assertCourseAccess(session.courseId, userId, role);
    return session;
  }

  async mark(sessionId: string, dto: MarkAttendanceDto, studentId: string, userAgent?: string) {
    const session = await this.prisma.attendanceSession.findUnique({ where: { id: sessionId }, include: { course: true } });
    if (!session) throw new NotFoundException("Attendance session not found");
    if (session.status !== AttendanceSessionStatus.ACTIVE || session.expiresAt <= new Date()) {
      throw new BadRequestException("Session expired");
    }
    const membership = await this.prisma.courseStudent.findUnique({
      where: { courseId_studentId: { courseId: session.courseId, studentId } },
    });
    if (!membership) throw new ForbiddenException("You are not registered for this course");
    const existing = await this.prisma.attendanceRecord.findUnique({
      where: { sessionId_studentId: { sessionId, studentId } },
    });
    if (existing) throw new BadRequestException("Attendance already marked");

    let method: AttendanceMethod;
    if (dto.pin && session.pinHash && await compare(dto.pin, session.pinHash)) method = AttendanceMethod.PIN;
    else if (dto.qrToken && session.qrTokenHash === this.digest(dto.qrToken)) method = AttendanceMethod.QR;
    else throw new BadRequestException(dto.pin ? "Invalid PIN" : "Invalid QR code");

    if (session.latitude === null || session.longitude === null) throw new BadRequestException("Session location is unavailable");
    const distance = this.distanceMetres(
      Number(session.latitude),
      Number(session.longitude),
      dto.latitude,
      dto.longitude,
    );
    const lecturerAccuracyAllowance = Math.min(session.locationAccuracy ?? 0, 100);
    const studentAccuracyAllowance = Math.min(dto.accuracy, 100);
    const maximumPlausibleDistance = session.radiusMetres + lecturerAccuracyAllowance + studentAccuracyAllowance;
    if (distance > maximumPlausibleDistance) {
      throw new BadRequestException(
        `You are ${Math.round(distance)}m from the captured classroom centre; the allowed radius is ${session.radiusMetres}m and the GPS readings do not overlap it. Enable precise location and retry.`,
      );
    }

    const lateAt = new Date(session.startsAt.getTime() + session.lateAfterMinutes * 60_000);
    const outsideStrictRadius = distance > session.radiusMetres;
    const suspicious = outsideStrictRadius || dto.accuracy > Math.max(100, session.radiusMetres);
    const status = suspicious
      ? AttendanceStatus.FLAGGED
      : new Date() > lateAt
        ? AttendanceStatus.LATE
        : AttendanceStatus.PRESENT;
    const record = await this.prisma.attendanceRecord.create({
      data: {
        sessionId,
        studentId,
        method,
        status,
        latitude: dto.latitude,
        longitude: dto.longitude,
        accuracy: dto.accuracy,
        distanceMetres: distance,
        flaggedReason: suspicious
          ? `GPS uncertainty review: measured ${Math.round(distance)}m, radius ${session.radiusMetres}m, lecturer accuracy ${Math.round(session.locationAccuracy ?? 0)}m, student accuracy ${Math.round(dto.accuracy)}m; ${userAgent ?? "unknown device"}`
          : null,
      },
    });
    await this.prisma.notification.create({
      data: {
        userId: studentId,
        type: "ATTENDANCE_MARKED",
        title: status === AttendanceStatus.FLAGGED ? "Attendance needs review" : "Attendance marked",
        message: `${session.course.code}: ${status.toLowerCase()}`,
        relatedEntityId: record.id,
      },
    });
    await recalculateStudentRisk(this.prisma, studentId);
    return record;
  }

  async close(id: string, lecturerId: string) {
    const session = await this.setSessionStatus(id, lecturerId, AttendanceSessionStatus.CLOSED);
    const [students, marked] = await Promise.all([
      this.prisma.courseStudent.findMany({ where: { courseId: session.courseId }, select: { studentId: true } }),
      this.prisma.attendanceRecord.findMany({ where: { sessionId: id }, select: { studentId: true } }),
    ]);
    const markedIds = new Set(marked.map((row) => row.studentId));
    const absentIds = students.map((row) => row.studentId).filter((studentId) => !markedIds.has(studentId));
    if (absentIds.length) {
      await this.prisma.attendanceRecord.createMany({
        data: absentIds.map((studentId) => ({ sessionId: id, studentId, method: session.method, status: AttendanceStatus.ABSENT })),
        skipDuplicates: true,
      });
    }
    await Promise.all(students.map(({ studentId }) => recalculateStudentRisk(this.prisma, studentId)));
    return session;
  }

  cancel(id: string, lecturerId: string) {
    return this.setSessionStatus(id, lecturerId, AttendanceSessionStatus.CANCELLED);
  }

  history(studentId: string) {
    return this.prisma.attendanceRecord.findMany({
      where: { studentId },
      include: { session: { include: { course: true } } },
      orderBy: { markedAt: "desc" },
    });
  }

  async updateRecord(id: string, dto: UpdateAttendanceRecordDto, actorId: string, role: UserRole) {
    const previous = await this.prisma.attendanceRecord.findUnique({ where: { id }, include: { session: true } });
    if (!previous) throw new NotFoundException("Attendance record not found");
    if (role === UserRole.LECTURER && previous.session.lecturerId !== actorId) throw new ForbiddenException();
    const record = await this.prisma.$transaction(async (tx) => {
      const record = await tx.attendanceRecord.update({
        where: { id },
        data: { status: dto.status, flaggedReason: dto.reason },
      });
      await tx.auditLog.create({
        data: {
          actorUserId: actorId,
          action: "ATTENDANCE_CHANGED",
          entityType: "AttendanceRecord",
          entityId: id,
          description: `Attendance changed from ${previous.status} to ${dto.status}`,
          previousValue: { status: previous.status },
          newValue: { status: dto.status },
          reason: dto.reason,
        },
      });
      return record;
    });
    await recalculateStudentRisk(this.prisma, record.studentId);
    return record;
  }

  private async setSessionStatus(id: string, lecturerId: string, status: AttendanceSessionStatus) {
    const session = await this.prisma.attendanceSession.findUnique({ where: { id } });
    if (!session) throw new NotFoundException("Attendance session not found");
    if (session.lecturerId !== lecturerId) throw new ForbiddenException("Only the session lecturer can change it");
    return this.prisma.attendanceSession.update({ where: { id }, data: { status } });
  }

  private async assertCourseAccess(courseId: string, userId: string, role: UserRole) {
    if (role === UserRole.ADMIN) return;
    const access = role === UserRole.STUDENT
      ? await this.prisma.courseStudent.findUnique({ where: { courseId_studentId: { courseId, studentId: userId } } })
      : await this.prisma.courseLecturer.findUnique({ where: { courseId_lecturerId: { courseId, lecturerId: userId } } });
    if (!access) throw new ForbiddenException("You do not have access to this course");
  }

  private async expireSessions() {
    const expired = await this.prisma.attendanceSession.findMany({
      where: { status: AttendanceSessionStatus.ACTIVE, expiresAt: { lte: new Date() } },
      select: { id: true, courseId: true, method: true },
    });
    if (!expired.length) return;
    await this.prisma.attendanceSession.updateMany({
      where: { id: { in: expired.map((session) => session.id) } },
      data: { status: AttendanceSessionStatus.EXPIRED },
    });
    for (const session of expired) {
      const [students, marked] = await Promise.all([
        this.prisma.courseStudent.findMany({ where: { courseId: session.courseId }, select: { studentId: true } }),
        this.prisma.attendanceRecord.findMany({ where: { sessionId: session.id }, select: { studentId: true } }),
      ]);
      const markedIds = new Set(marked.map((row) => row.studentId));
      const absentIds = students.map((row) => row.studentId).filter((studentId) => !markedIds.has(studentId));
      if (absentIds.length) {
        await this.prisma.attendanceRecord.createMany({
        data: absentIds.map((studentId) => ({ sessionId: session.id, studentId, method: session.method, status: AttendanceStatus.ABSENT })),
          skipDuplicates: true,
        });
      }
      await Promise.all(students.map(({ studentId }) => recalculateStudentRisk(this.prisma, studentId)));
    }
  }

  private digest(value: string) {
    return createHash("sha256").update(value).digest("hex");
  }

  private distanceMetres(lat1: number, lon1: number, lat2: number, lon2: number) {
    const radians = (value: number) => value * Math.PI / 180;
    const dLat = radians(lat2 - lat1);
    const dLon = radians(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(dLon / 2) ** 2;
    return 6_371_000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}
