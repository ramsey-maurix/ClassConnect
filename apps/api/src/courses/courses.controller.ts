import { Body, Controller, Delete, Get, Param, Patch, Post, Req } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { ApiCookieAuth, ApiParam, ApiTags } from "@nestjs/swagger";
import { Roles } from "../auth/roles.decorator";
import type { RequestWithUser } from "../common/request-with-user";
import { CoursesService } from "./courses.service";
import { AddStudentsDto, AssignLecturerDto, CreateCourseDto, UpdateCourseDto } from "./dto/course.dto";

@Controller("courses")
@ApiTags("Courses")
@ApiCookieAuth("classconnect_access")
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
  @ApiParam({ name: "id", description: "Course offering ID" })
  get(@Param("id") id: string, @Req() request: RequestWithUser) {
    return this.courses.get(id, request.user.sub, request.user.role);
  }

  @Roles(UserRole.ADMIN)
  @Patch(":id")
  @ApiParam({ name: "id", description: "Course offering ID" })
  update(@Param("id") id: string, @Body() dto: UpdateCourseDto) {
    return this.courses.update(id, dto);
  }

  @Roles(UserRole.ADMIN)
  @Post(":id/lecturers")
  @ApiParam({ name: "id", description: "Course offering ID" })
  assignLecturer(@Param("id") id: string, @Body() dto: AssignLecturerDto, @Req() request: RequestWithUser) {
    return this.courses.assignLecturer(id, dto, request.user.sub, request.ip);
  }

  @Roles(UserRole.ADMIN)
  @Delete(":id/lecturers/:lecturerId")
  @ApiParam({ name: "id", description: "Course offering ID" })
  @ApiParam({ name: "lecturerId", description: "Lecturer user ID" })
  removeLecturer(@Param("id") id: string, @Param("lecturerId") lecturerId: string, @Req() request: RequestWithUser) {
    return this.courses.removeLecturer(id, lecturerId, request.user.sub);
  }

  @Roles(UserRole.ADMIN)
  @Post(":id/students")
  @ApiParam({ name: "id", description: "Course offering ID" })
  addStudents(@Param("id") id: string, @Body() dto: AddStudentsDto, @Req() request: RequestWithUser) {
    return this.courses.addStudents(id, dto, request.user.sub, request.ip);
  }

  @Roles(UserRole.ADMIN)
  @Delete(":id/students/:studentId")
  @ApiParam({ name: "id", description: "Course offering ID" })
  @ApiParam({ name: "studentId", description: "Student user ID" })
  removeStudent(@Param("id") id: string, @Param("studentId") studentId: string, @Req() request: RequestWithUser) {
    return this.courses.removeStudent(id, studentId, request.user.sub);
  }
}
