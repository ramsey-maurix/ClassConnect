import { Module } from "@nestjs/common";
import { ClassAssignmentsController } from "./class-assignments.controller";
import { ClassAssignmentsService } from "./class-assignments.service";

@Module({
  controllers: [ClassAssignmentsController],
  providers: [ClassAssignmentsService],
})
export class ClassAssignmentsModule {}
