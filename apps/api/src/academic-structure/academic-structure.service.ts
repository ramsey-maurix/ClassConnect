import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { CreateDepartmentDto, CreateFacultyDto } from "./dto/academic-structure.dto";

@Injectable()
export class AcademicStructureService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.faculty.findMany({
      include: { departments: { include: { programmes: { orderBy: { name: "asc" } } }, orderBy: { name: "asc" } } },
      orderBy: { name: "asc" },
    });
  }

  createFaculty(dto: CreateFacultyDto, actorId: string) {
    return this.prisma.$transaction(async (tx) => {
      const faculty = await tx.faculty.create({ data: { code: dto.code.toUpperCase(), name: dto.name.trim() } });
      await tx.auditLog.create({
        data: { actorUserId: actorId, action: "FACULTY_CREATED", entityType: "Faculty", entityId: faculty.id, description: `${faculty.code} ${faculty.name} created` },
      });
      return faculty;
    });
  }

  createDepartment(dto: CreateDepartmentDto, actorId: string) {
    return this.prisma.$transaction(async (tx) => {
      const department = await tx.department.create({
        data: { facultyId: dto.facultyId, code: dto.code.toUpperCase(), name: dto.name.trim() },
        include: { faculty: true },
      });
      await tx.auditLog.create({
        data: { actorUserId: actorId, action: "DEPARTMENT_CREATED", entityType: "Department", entityId: department.id, description: `${department.code} ${department.name} created` },
      });
      return department;
    });
  }
}
