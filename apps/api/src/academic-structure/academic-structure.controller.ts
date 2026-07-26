import { Controller, Get } from "@nestjs/common";
import { AcademicStructureService } from "./academic-structure.service";

@Controller("academic-structure")
export class AcademicStructureController {
  constructor(private readonly structure: AcademicStructureService) {}

  @Get()
  list() {
    return this.structure.list();
  }
}
