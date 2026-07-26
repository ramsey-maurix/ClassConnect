import { Controller, Get } from "@nestjs/common";
import { ApiCookieAuth, ApiTags } from "@nestjs/swagger";
import { AcademicStructureService } from "./academic-structure.service";

@Controller("academic-structure")
@ApiTags("Academic structure")
@ApiCookieAuth("classconnect_access")
export class AcademicStructureController {
  constructor(private readonly structure: AcademicStructureService) {}

  @Get()
  list() {
    return this.structure.list();
  }
}
