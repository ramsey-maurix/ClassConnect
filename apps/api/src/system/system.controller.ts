import { Body, Controller, Get, Param, Patch, Query, Req } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { IsObject } from "class-validator";
import { Roles } from "../auth/roles.decorator";
import { Public } from "../auth/public.decorator";
import type { RequestWithUser } from "../common/request-with-user";
import { SystemService } from "./system.service";

class UpdateSettingsDto {
  @IsObject()
  settings!: Record<string, unknown>;
}

@Controller()
export class SystemController {
  constructor(private readonly system: SystemService) {}

  @Public()
  @Get("health")
  health() {
    return { status: "ok", service: "classconnect-api", timestamp: new Date().toISOString() };
  }

  @Get("notifications")
  notifications(@Req() request: RequestWithUser) {
    return this.system.notifications(request.user.sub);
  }

  @Patch("notifications/read-all")
  readAll(@Req() request: RequestWithUser) {
    return this.system.readAll(request.user.sub);
  }

  @Patch("notifications/:id/read")
  read(@Param("id") id: string, @Req() request: RequestWithUser) {
    return this.system.readNotification(id, request.user.sub);
  }

  @Get("analytics/student")
  @Roles(UserRole.STUDENT)
  studentAnalytics(@Req() request: RequestWithUser) {
    return this.system.studentAnalytics(request.user.sub);
  }

  @Get("analytics/course/:courseId")
  @Roles(UserRole.LECTURER, UserRole.ADMIN)
  courseAnalytics(@Param("courseId") courseId: string, @Req() request: RequestWithUser) {
    return this.system.courseAnalytics(courseId, request.user.sub, request.user.role);
  }

  @Get("analytics/admin")
  @Roles(UserRole.ADMIN)
  adminAnalytics() {
    return this.system.adminAnalytics();
  }

  @Get("audit")
  @Roles(UserRole.ADMIN)
  audit(@Query("take") take?: string) {
    return this.system.audit(Number(take) || 100);
  }

  @Get("settings")
  @Roles(UserRole.ADMIN)
  settings() {
    return this.system.settings();
  }

  @Patch("settings")
  @Roles(UserRole.ADMIN)
  updateSettings(@Body() dto: UpdateSettingsDto, @Req() request: RequestWithUser) {
    return this.system.updateSettings(dto.settings, request.user.sub);
  }
}
