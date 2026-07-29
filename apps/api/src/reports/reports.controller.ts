import { Body, Controller, Param, Post, Req } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { ApiCookieAuth, ApiParam, ApiTags } from "@nestjs/swagger";
import { Roles } from "../auth/roles.decorator";
import type { RequestWithUser } from "../common/request-with-user";
import { ReportsService } from "./reports.service";

@Roles(UserRole.ADMIN)
@Controller("reports")
@ApiTags("Reports")
@ApiCookieAuth("classconnect_access")
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Post(":type")
  @ApiParam({
    name: "type",
    enum: ["attendance", "grades", "risk", "users"],
    description: "Report type to generate",
  })
  generate(@Param("type") type: string, @Body() filters: Record<string, string>, @Req() request: RequestWithUser) {
    return this.reports.generate(type, request.user.sub, request.ip, filters);
  }
}
