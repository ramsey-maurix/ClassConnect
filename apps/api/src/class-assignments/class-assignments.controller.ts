import { Body, Controller, Delete, Get, Param, Post, Req } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { Roles } from "../auth/roles.decorator";
import type { RequestWithUser } from "../common/request-with-user";
import { ClassAssignmentsService } from "./class-assignments.service";
import { AssignStudentsDto } from "./dto/assign-students.dto";

@Roles(UserRole.ADMIN)
@Controller("class-assignments")
export class ClassAssignmentsController {
  constructor(private readonly assignments: ClassAssignmentsService) {}

  @Get("classes")
  classes() {
    return this.assignments.classes();
  }

  @Get("classes/:offeringId")
  getClass(@Param("offeringId") offeringId: string) {
    return this.assignments.getClass(offeringId);
  }

  @Post("classes/:offeringId/students")
  assign(
    @Param("offeringId") offeringId: string,
    @Body() dto: AssignStudentsDto,
    @Req() request: RequestWithUser,
  ) {
    return this.assignments.assign(offeringId, dto, request.user.sub, request.ip);
  }

  @Delete("classes/:offeringId/students/:studentId")
  remove(
    @Param("offeringId") offeringId: string,
    @Param("studentId") studentId: string,
    @Req() request: RequestWithUser,
  ) {
    return this.assignments.remove(offeringId, studentId, request.user.sub, request.ip);
  }
}
