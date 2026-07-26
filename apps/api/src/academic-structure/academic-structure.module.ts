import { Module } from "@nestjs/common";
import { AcademicStructureController } from "./academic-structure.controller";
import { AcademicStructureService } from "./academic-structure.service";

@Module({ controllers: [AcademicStructureController], providers: [AcademicStructureService] })
export class AcademicStructureModule {}
