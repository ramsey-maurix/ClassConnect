import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AuthModule } from "./auth/auth.module";
import { CoursesModule } from "./courses/courses.module";
import { PrismaModule } from "./prisma/prisma.module";
import { UsersModule } from "./users/users.module";
import { AttendanceModule } from "./attendance/attendance.module";
import { GradesModule } from "./grades/grades.module";
import { SystemModule } from "./system/system.module";
import { ClassAssignmentsModule } from "./class-assignments/class-assignments.module";
import { AcademicStructureModule } from "./academic-structure/academic-structure.module";
import { ReportsModule } from "./reports/reports.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    PrismaModule,
    AuthModule,
    UsersModule,
    CoursesModule,
    AttendanceModule,
    GradesModule,
    SystemModule,
    ClassAssignmentsModule,
    AcademicStructureModule,
    ReportsModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
