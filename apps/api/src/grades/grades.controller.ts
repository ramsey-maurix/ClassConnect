import { Body, Controller, Delete, Get, Param, Patch, Post, Req } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { Roles } from "../auth/roles.decorator";
import type { RequestWithUser } from "../common/request-with-user";
import { CorrectGradeDto, CreateAssessmentDto, SaveGradesDto } from "./dto/grades.dto";
import { GradesService } from "./grades.service";

@Controller()
export class GradesController {
  constructor(private readonly grades: GradesService) {}

  @Roles(UserRole.LECTURER)
  @Post("assessments")
  create(@Body() dto: CreateAssessmentDto, @Req() request: RequestWithUser) {
    return this.grades.createAssessment(dto, request.user.sub);
  }

  @Roles(UserRole.LECTURER)
  @Delete("assessments/:id")
  remove(@Param("id") id: string, @Req() request: RequestWithUser) {
    return this.grades.deleteAssessment(id, request.user.sub);
  }

  @Get("courses/:courseId/assessments")
  assessments(@Param("courseId") courseId: string, @Req() request: RequestWithUser) {
    return this.grades.listAssessments(courseId, request.user.sub, request.user.role);
  }

  @Roles(UserRole.LECTURER)
  @Post("assessments/:id/grades/draft")
  draft(@Param("id") id: string, @Body() dto: SaveGradesDto, @Req() request: RequestWithUser) {
    return this.grades.saveDraft(id, dto, request.user.sub);
  }

  @Roles(UserRole.LECTURER)
  @Post("assessments/:id/grades/publish")
  publish(@Param("id") id: string, @Req() request: RequestWithUser) {
    return this.grades.publish(id, request.user.sub);
  }

  @Roles(UserRole.LECTURER)
  @Patch("grades/:id")
  correct(@Param("id") id: string, @Body() dto: CorrectGradeDto, @Req() request: RequestWithUser) {
    return this.grades.correct(id, dto, request.user.sub);
  }

  @Roles(UserRole.STUDENT)
  @Get("students/me/grades")
  mine(@Req() request: RequestWithUser) {
    return this.grades.myGrades(request.user.sub);
  }

  @Get("courses/:courseId/grades")
  course(@Param("courseId") courseId: string, @Req() request: RequestWithUser) {
    return this.grades.courseGrades(courseId, request.user.sub, request.user.role);
  }
}
