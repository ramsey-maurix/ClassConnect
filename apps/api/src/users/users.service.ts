import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, UserRole } from "@prisma/client";
import { hash } from "bcryptjs";
import { PrismaService } from "../prisma/prisma.service";
import type { CreateUserDto } from "./dto/create-user.dto";
import type { ResetPasswordDto, UpdateUserDto, UpdateUserStatusDto } from "./dto/update-user.dto";

const safeSelect = {
  id: true,
  email: true,
  role: true,
  status: true,
  firstName: true,
  lastName: true,
  studentNumber: true,
  staffNumber: true,
  phone: true,
  profileImageUrl: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
  mustChangePassword: true,
  department: { select: { id: true, name: true, code: true, faculty: { select: { id: true, name: true, code: true } } } },
  programme: { select: { id: true, name: true, code: true, awardType: true } },
} as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  list(query?: string, role?: UserRole) {
    return this.prisma.user.findMany({
      where: {
        role,
        ...(query
          ? {
              OR: [
                { firstName: { contains: query, mode: "insensitive" as const } },
                { lastName: { contains: query, mode: "insensitive" as const } },
                { email: { contains: query, mode: "insensitive" as const } },
                { studentNumber: { contains: query, mode: "insensitive" as const } },
                { staffNumber: { contains: query, mode: "insensitive" as const } },
              ],
            }
          : {}),
      },
      select: safeSelect,
      orderBy: [{ role: "asc" }, { lastName: "asc" }],
    });
  }

  async get(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        ...safeSelect,
        studentCourses: { include: { course: true } },
        lecturerCourses: { include: { course: true } },
      },
    });
    if (!user) throw new NotFoundException("User not found");
    return user;
  }

  async create(dto: CreateUserDto, actorId: string, ipAddress?: string) {
    if (dto.role === UserRole.STUDENT && !dto.studentNumber) {
      throw new BadRequestException("Student number is required for a student");
    }
    if (dto.role === UserRole.STUDENT && !dto.programmeId) {
      throw new BadRequestException("Programme is required for a student");
    }
    if (dto.role !== UserRole.STUDENT && !dto.staffNumber) {
      throw new BadRequestException("Staff number is required for lecturers and administrators");
    }
    try {
      let departmentId = dto.departmentId;
      if (dto.role === UserRole.STUDENT) {
        const programme = await this.prisma.programme.findUnique({ where: { id: dto.programmeId } });
        if (!programme) throw new BadRequestException("Select a valid programme");
        departmentId = programme.departmentId;
      }
      return await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email: dto.email.toLowerCase(),
            passwordHash: await hash(dto.temporaryPassword, 12),
            role: dto.role,
            firstName: dto.firstName,
            lastName: dto.lastName,
            studentNumber: dto.role === UserRole.STUDENT ? dto.studentNumber : null,
            staffNumber: dto.role === UserRole.STUDENT ? null : dto.staffNumber,
            phone: dto.phone,
            departmentId,
            programmeId: dto.role === UserRole.STUDENT ? dto.programmeId : null,
            mustChangePassword: true,
          },
          select: safeSelect,
        });
        await tx.auditLog.create({
          data: {
            actorUserId: actorId,
            action: "USER_CREATED",
            entityType: "User",
            entityId: user.id,
            description: `${dto.role.toLowerCase()} account created for ${dto.firstName} ${dto.lastName}`,
            ipAddress,
          },
        });
        return user;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new BadRequestException("Email, student number, or staff number already exists");
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateUserDto) {
    let departmentId = dto.departmentId;
    if (dto.programmeId) {
      const programme = await this.prisma.programme.findUnique({ where: { id: dto.programmeId } });
      if (!programme) throw new BadRequestException("Select a valid programme");
      departmentId = programme.departmentId;
    }
    return this.prisma.user.update({ where: { id }, data: { ...dto, departmentId }, select: safeSelect });
  }

  async updateStatus(id: string, dto: UpdateUserStatusDto, actorId: string, ipAddress?: string) {
    return this.prisma.$transaction(async (tx) => {
      const previous = await tx.user.findUniqueOrThrow({ where: { id } });
      const user = await tx.user.update({ where: { id }, data: { status: dto.status }, select: safeSelect });
      if (dto.status !== "ACTIVE") {
        await tx.refreshSession.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
      }
      await tx.auditLog.create({
        data: {
          actorUserId: actorId,
          action: "USER_STATUS_CHANGED",
          entityType: "User",
          entityId: id,
          description: `User status changed from ${previous.status} to ${dto.status}`,
          previousValue: { status: previous.status },
          newValue: { status: dto.status },
          reason: dto.reason,
          ipAddress,
        },
      });
      return user;
    });
  }

  async resetPassword(id: string, dto: ResetPasswordDto, actorId: string, ipAddress?: string) {
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id }, data: { passwordHash: await hash(dto.temporaryPassword, 12), mustChangePassword: true } }),
      this.prisma.refreshSession.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } }),
      this.prisma.auditLog.create({
        data: {
          actorUserId: actorId,
          action: "PASSWORD_RESET",
          entityType: "User",
          entityId: id,
          description: "Administrator reset a user password",
          reason: dto.reason,
          ipAddress,
        },
      }),
    ]);
    return { message: "Temporary password set and active sessions revoked" };
  }
}
