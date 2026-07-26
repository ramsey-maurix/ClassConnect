import { Controller, Param, Post, Req } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { Roles } from "../auth/roles.decorator";
import type { RequestWithUser } from "../common/request-with-user";
import { ReportsService } from "./reports.service";

@Roles(UserRole.ADMIN)
@Controller("reports")
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Post(":type")
  generate(@Param("type") type: string, @Req() request: RequestWithUser) {
    return this.reports.generate(type, request.user.sub, request.ip);
  }
}
