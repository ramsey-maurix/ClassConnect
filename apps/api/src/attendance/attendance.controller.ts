import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { ApiCookieAuth, ApiParam, ApiTags } from "@nestjs/swagger";
import { Roles } from "../auth/roles.decorator";
import type { RequestWithUser } from "../common/request-with-user";
import { AttendanceService } from "./attendance.service";
import { CreateAttendanceSessionDto, MarkAttendanceDto, UpdateAttendanceRecordDto } from "./dto/attendance.dto";

@Controller("attendance")
@ApiTags("Attendance")
@ApiCookieAuth("classconnect_access")
export class AttendanceController {
  constructor(private readonly attendance: AttendanceService) {}

  @Roles(UserRole.LECTURER)
  @Post("sessions")
  create(@Body() dto: CreateAttendanceSessionDto, @Req() request: RequestWithUser) {
    return this.attendance.createSession(dto, request.user.sub, request.ip);
  }

  @Get("sessions/active")
  active(@Req() request: RequestWithUser) {
    return this.attendance.active(request.user.sub, request.user.role);
  }

  @Get("policies")
  policies() {
    return this.attendance.policies();
  }

  @Roles(UserRole.ADMIN)
  @Get("admin/sessions")
  adminSessions(
    @Query("programmeId") programmeId?: string,
    @Query("courseId") courseId?: string,
    @Query("lecturerId") lecturerId?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("status") status?: string,
    @Query("method") method?: string,
    @Query("academicYear") academicYear?: string,
    @Query("semester") semester?: string,
  ) {
    return this.attendance.adminSessions({ programmeId, courseId, lecturerId, from, to, status, method, academicYear, semester });
  }

  @Roles(UserRole.LECTURER)
  @Get("sessions")
  sessions(@Req() request: RequestWithUser) {
    return this.attendance.sessions(request.user.sub);
  }

  @Roles(UserRole.STUDENT)
  @Get("student/history")
  history(@Req() request: RequestWithUser) {
    return this.attendance.history(request.user.sub);
  }

  @Get("sessions/:id")
  @ApiParam({ name: "id", description: "Attendance session ID" })
  get(@Param("id") id: string, @Req() request: RequestWithUser) {
    return this.attendance.get(id, request.user.sub, request.user.role);
  }

  @Roles(UserRole.STUDENT)
  @Post("sessions/:id/mark")
  @ApiParam({ name: "id", description: "Attendance session ID" })
  mark(@Param("id") id: string, @Body() dto: MarkAttendanceDto, @Req() request: RequestWithUser) {
    return this.attendance.mark(id, dto, request.user.sub, request.get("user-agent"));
  }

  @Roles(UserRole.LECTURER)
  @Post("sessions/:id/close")
  @ApiParam({ name: "id", description: "Attendance session ID" })
  close(@Param("id") id: string, @Req() request: RequestWithUser) {
    return this.attendance.close(id, request.user.sub);
  }

  @Roles(UserRole.LECTURER)
  @Post("sessions/:id/cancel")
  @ApiParam({ name: "id", description: "Attendance session ID" })
  cancel(@Param("id") id: string, @Req() request: RequestWithUser) {
    return this.attendance.cancel(id, request.user.sub);
  }

  @Roles(UserRole.LECTURER)
  @Delete("sessions/:id")
  @ApiParam({ name: "id", description: "Empty attendance session ID" })
  deleteEmpty(@Param("id") id: string, @Req() request: RequestWithUser) {
    return this.attendance.deleteEmptySession(id, request.user.sub);
  }

  @Roles(UserRole.LECTURER)
  @Post("sessions/:id/qr/rotate")
  @ApiParam({ name: "id", description: "QR attendance session ID" })
  rotateQr(@Param("id") id: string, @Req() request: RequestWithUser) {
    return this.attendance.rotateQrToken(id, request.user.sub);
  }

  @Roles(UserRole.LECTURER)
  @Post("sessions/:id/pin/reissue")
  @ApiParam({ name: "id", description: "PIN attendance session ID" })
  reissuePin(@Param("id") id: string, @Req() request: RequestWithUser) {
    return this.attendance.reissuePin(id, request.user.sub);
  }

  @Roles(UserRole.LECTURER, UserRole.ADMIN)
  @Get("sessions/:id/records")
  @ApiParam({ name: "id", description: "Attendance session ID" })
  records(@Param("id") id: string, @Req() request: RequestWithUser) {
    return this.attendance.get(id, request.user.sub, request.user.role).then((session) => session.records);
  }

  @Roles(UserRole.LECTURER, UserRole.ADMIN)
  @Patch("records/:id")
  @ApiParam({ name: "id", description: "Attendance record ID" })
  updateRecord(@Param("id") id: string, @Body() dto: UpdateAttendanceRecordDto, @Req() request: RequestWithUser) {
    return this.attendance.updateRecord(id, dto, request.user.sub, request.user.role);
  }
}
