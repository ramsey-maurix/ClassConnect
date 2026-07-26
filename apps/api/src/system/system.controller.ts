import { Body, Controller, Get, Param, Patch, Query, Req } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { ApiCookieAuth, ApiParam, ApiProperty, ApiQuery, ApiTags } from "@nestjs/swagger";
import { IsObject } from "class-validator";
import { Roles } from "../auth/roles.decorator";
import { Public } from "../auth/public.decorator";
import type { RequestWithUser } from "../common/request-with-user";
import { SystemService } from "./system.service";

class UpdateSettingsDto {
  @ApiProperty({
    type: "object",
    additionalProperties: true,
    example: { academicWarningGpa: 2, defaultGpsRadiusMetres: 100 },
  })
  @IsObject()
  settings!: Record<string, unknown>;
}

@Controller()
@ApiTags("System")
export class SystemController {
  constructor(private readonly system: SystemService) {}

  @Public()
  @Get("health")
  health() {
    return { status: "ok", service: "classconnect-api", timestamp: new Date().toISOString() };
  }

  @Get("notifications")
  @ApiCookieAuth("classconnect_access")
  notifications(@Req() request: RequestWithUser) {
    return this.system.notifications(request.user.sub);
  }

  @Patch("notifications/read-all")
  @ApiCookieAuth("classconnect_access")
  readAll(@Req() request: RequestWithUser) {
    return this.system.readAll(request.user.sub);
  }

  @Patch("notifications/:id/read")
  @ApiCookieAuth("classconnect_access")
  @ApiParam({ name: "id", description: "Notification ID" })
  read(@Param("id") id: string, @Req() request: RequestWithUser) {
    return this.system.readNotification(id, request.user.sub);
  }

  @Get("analytics/student")
  @ApiCookieAuth("classconnect_access")
  @Roles(UserRole.STUDENT)
  studentAnalytics(@Req() request: RequestWithUser) {
    return this.system.studentAnalytics(request.user.sub);
  }

  @Get("analytics/course/:courseId")
  @ApiCookieAuth("classconnect_access")
  @ApiParam({ name: "courseId", description: "Course offering ID" })
  @Roles(UserRole.LECTURER, UserRole.ADMIN)
  courseAnalytics(@Param("courseId") courseId: string, @Req() request: RequestWithUser) {
    return this.system.courseAnalytics(courseId, request.user.sub, request.user.role);
  }

  @Get("analytics/admin")
  @ApiCookieAuth("classconnect_access")
  @Roles(UserRole.ADMIN)
  adminAnalytics() {
    return this.system.adminAnalytics();
  }

  @Get("audit")
  @ApiCookieAuth("classconnect_access")
  @ApiQuery({ name: "take", required: false, type: Number, example: 100, description: "Maximum audit entries" })
  @Roles(UserRole.ADMIN)
  audit(@Query("take") take?: string) {
    return this.system.audit(Number(take) || 100);
  }

  @Get("settings")
  @ApiCookieAuth("classconnect_access")
  @Roles(UserRole.ADMIN)
  settings() {
    return this.system.settings();
  }

  @Patch("settings")
  @ApiCookieAuth("classconnect_access")
  @Roles(UserRole.ADMIN)
  updateSettings(@Body() dto: UpdateSettingsDto, @Req() request: RequestWithUser) {
    return this.system.updateSettings(dto.settings, request.user.sub);
  }
}
