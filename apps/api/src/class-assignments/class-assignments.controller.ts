import { Body, Controller, Delete, Get, Param, Post, Req } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { ApiCookieAuth, ApiParam, ApiTags } from "@nestjs/swagger";
import { Roles } from "../auth/roles.decorator";
import type { RequestWithUser } from "../common/request-with-user";
import { ClassAssignmentsService } from "./class-assignments.service";
import { AssignStudentsDto } from "./dto/assign-students.dto";

@Roles(UserRole.ADMIN)
@Controller("class-assignments")
@ApiTags("Class assignments")
@ApiCookieAuth("classconnect_access")
export class ClassAssignmentsController {
  constructor(private readonly assignments: ClassAssignmentsService) {}

  @Get("classes")
  classes() {
    return this.assignments.classes();
  }

  @Get("classes/:offeringId")
  @ApiParam({ name: "offeringId", description: "Course offering ID" })
  getClass(@Param("offeringId") offeringId: string) {
    return this.assignments.getClass(offeringId);
  }

  @Post("classes/:offeringId/students")
  @ApiParam({ name: "offeringId", description: "Course offering ID" })
  assign(
    @Param("offeringId") offeringId: string,
    @Body() dto: AssignStudentsDto,
    @Req() request: RequestWithUser,
  ) {
    return this.assignments.assign(offeringId, dto, request.user.sub, request.ip);
  }

  @Delete("classes/:offeringId/students/:studentId")
  @ApiParam({ name: "offeringId", description: "Course offering ID" })
  @ApiParam({ name: "studentId", description: "Student user ID" })
  remove(
    @Param("offeringId") offeringId: string,
    @Param("studentId") studentId: string,
    @Req() request: RequestWithUser,
  ) {
    return this.assignments.remove(offeringId, studentId, request.user.sub, request.ip);
  }
}
