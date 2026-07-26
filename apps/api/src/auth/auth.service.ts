import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { UserStatus } from "@prisma/client";
import { compare, hash } from "bcryptjs";
import { createHash } from "node:crypto";
import type { Request, Response } from "express";
import { PrismaService } from "../prisma/prisma.service";
import type { AuthUser } from "../common/auth-user";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "./auth.constants";
import type { ChangePasswordDto } from "./dto/change-password.dto";
import type { LoginDto } from "./dto/login.dto";

const safeUserSelect = {
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
  mustChangePassword: true,
  department: {
    select: {
      id: true,
      name: true,
      code: true,
      faculty: { select: { id: true, name: true, code: true } },
    },
  },
  programme: { select: { id: true, name: true, code: true, awardType: true } },
  lastLoginAt: true,
} as const;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(dto: LoginDto, request: Request, response: Response) {
    const identifier = dto.identifier.trim();
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: identifier.toLowerCase(), mode: "insensitive" } },
          { studentNumber: identifier },
          { staffNumber: { equals: identifier, mode: "insensitive" } },
        ],
      },
    });
    if (!user || !(await compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException("Invalid email or password");
    }
    if (user.status === UserStatus.SUSPENDED) throw new UnauthorizedException("This account is suspended");
    if (user.status !== UserStatus.ACTIVE) throw new UnauthorizedException("This account is disabled");

    await this.issueSession(
      { sub: user.id, email: user.email, role: user.role },
      request,
      response,
      dto.rememberMe,
    );
    const safeUser = await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
      select: safeUserSelect,
    });
    await this.prisma.auditLog.create({
      data: {
        actorUserId: user.id,
        action: "LOGIN",
        entityType: "User",
        entityId: user.id,
        description: "User signed in",
        ipAddress: request.ip,
      },
    });
    return { user: safeUser };
  }

  async refresh(refreshToken: string | undefined, request: Request, response: Response) {
    if (!refreshToken) throw new UnauthorizedException("Refresh session required");
    let payload: AuthUser & { sid: string };
    try {
      payload = await this.jwt.verifyAsync(refreshToken, {
        secret: this.config.getOrThrow<string>("JWT_REFRESH_SECRET"),
      });
    } catch {
      throw new UnauthorizedException("Refresh session expired");
    }

    const session = await this.prisma.refreshSession.findUnique({ where: { id: payload.sid }, include: { user: true } });
    if (
      !session ||
      session.revokedAt ||
      session.expiresAt <= new Date() ||
      session.tokenHash !== this.digest(refreshToken) ||
      session.user.status !== UserStatus.ACTIVE
    ) {
      throw new UnauthorizedException("Refresh session is no longer valid");
    }

    await this.prisma.refreshSession.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
    await this.issueSession(
      { sub: session.user.id, email: session.user.email, role: session.user.role },
      request,
      response,
      true,
    );
    return { user: await this.me(session.user.id) };
  }

  async logout(refreshToken: string | undefined, userId: string, request: Request, response: Response) {
    if (refreshToken) {
      await this.prisma.refreshSession.updateMany({
        where: { userId, tokenHash: this.digest(refreshToken), revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    this.clearCookies(response);
    await this.prisma.auditLog.create({
      data: {
        actorUserId: userId,
        action: "LOGOUT",
        entityType: "User",
        entityId: userId,
        description: "User signed out",
        ipAddress: request.ip,
      },
    });
  }

  me(userId: string) {
    return this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: safeUserSelect });
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!(await compare(dto.currentPassword, user.passwordHash))) {
      throw new BadRequestException("Current password is incorrect");
    }
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { passwordHash: await hash(dto.newPassword, 12), mustChangePassword: false },
      }),
      this.prisma.refreshSession.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
      this.prisma.auditLog.create({
        data: {
          actorUserId: userId,
          action: "PASSWORD_CHANGED",
          entityType: "User",
          entityId: userId,
          description: "User changed their password",
        },
      }),
    ]);
    return { message: "Password changed successfully" };
  }

  private async issueSession(payload: AuthUser, request: Request, response: Response, remember = false) {
    const refreshDays = remember ? this.config.get<number>("REFRESH_TOKEN_DAYS", 7) : 1;
    const expiresAt = new Date(Date.now() + refreshDays * 86_400_000);
    const session = await this.prisma.refreshSession.create({
      data: {
        userId: payload.sub,
        tokenHash: `pending-${Date.now()}-${payload.sub}`,
        expiresAt,
        ipAddress: request.ip,
        userAgent: request.get("user-agent"),
      },
    });
    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.getOrThrow<string>("JWT_ACCESS_SECRET"),
      expiresIn: this.config.get<string>("ACCESS_TOKEN_TTL", "15m") as never,
    });
    const refreshToken = await this.jwt.signAsync({ ...payload, sid: session.id }, {
      secret: this.config.getOrThrow<string>("JWT_REFRESH_SECRET"),
      expiresIn: `${refreshDays}d`,
    });
    await this.prisma.refreshSession.update({
      where: { id: session.id },
      data: { tokenHash: this.digest(refreshToken) },
    });

    const secure = this.config.get<string>("COOKIE_SECURE", "false") === "true";
    const base = { httpOnly: true, secure, sameSite: "lax" as const, path: "/" };
    response.cookie(ACCESS_COOKIE, accessToken, { ...base, maxAge: 15 * 60 * 1000 });
    response.cookie(REFRESH_COOKIE, refreshToken, { ...base, maxAge: refreshDays * 86_400_000 });
  }

  private clearCookies(response: Response) {
    response.clearCookie(ACCESS_COOKIE, { path: "/" });
    response.clearCookie(REFRESH_COOKIE, { path: "/" });
  }

  private digest(value: string) {
    return createHash("sha256").update(value).digest("hex");
  }
}
