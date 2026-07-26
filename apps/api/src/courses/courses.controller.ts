import { Body, Controller, Delete, Get, Param, Patch, Post, Req } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { Roles } from "../auth/roles.decorator";
import type { RequestWithUser } from "../common/request-with-user";
import { CoursesService } from "./courses.service";
import { AddStudentsDto, AssignLecturerDto, CreateCourseDto, UpdateCourseDto } from "./dto/course.dto";

@Controller("courses")
export class CoursesController {
  constructor(private readonly courses: CoursesService) {}

  @Get()
  list(@Req() request: RequestWithUser) {
    return this.courses.list(request.user.sub, request.user.role);
  }

  @Roles(UserRole.ADMIN)
  @Post()
  create(@Body() dto: CreateCourseDto, @Req() request: RequestWithUser) {
    return this.courses.create(dto, request.user.sub, request.ip);
  }

  @Get(":id")
  get(@Param("id") id: string, @Req() request: RequestWithUser) {
    return this.courses.get(id, request.user.sub, request.user.role);
  }

  @Roles(UserRole.ADMIN)
  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateCourseDto) {
    return this.courses.update(id, dto);
  }

  @Roles(UserRole.ADMIN)
  @Post(":id/lecturers")
  assignLecturer(@Param("id") id: string, @Body() dto: AssignLecturerDto, @Req() request: RequestWithUser) {
    return this.courses.assignLecturer(id, dto, request.user.sub, request.ip);
  }

  @Roles(UserRole.ADMIN)
  @Delete(":id/lecturers/:lecturerId")
  removeLecturer(@Param("id") id: string, @Param("lecturerId") lecturerId: string, @Req() request: RequestWithUser) {
    return this.courses.removeLecturer(id, lecturerId, request.user.sub);
  }

  @Roles(UserRole.ADMIN)
  @Post(":id/students")
  addStudents(@Param("id") id: string, @Body() dto: AddStudentsDto, @Req() request: RequestWithUser) {
    return this.courses.addStudents(id, dto, request.user.sub, request.ip);
  }

  @Roles(UserRole.ADMIN)
  @Delete(":id/students/:studentId")
  removeStudent(@Param("id") id: string, @Param("studentId") studentId: string, @Req() request: RequestWithUser) {
    return this.courses.removeStudent(id, studentId, request.user.sub);
  }
}
