import { CourseStatus, Semester } from "@prisma/client";
import { ArrayMinSize, IsArray, IsEnum, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class CreateCourseDto {
  @IsString()
  code!: string;

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsInt()
  @Min(1)
  @Max(12)
  creditHours!: number;

  @IsString()
  academicYear!: string;

  @IsEnum(Semester)
  semester!: Semester;

  @IsOptional()
  @IsString()
  lecturerId?: string;

  @IsOptional()
  @IsEnum(CourseStatus)
  status?: CourseStatus;

  @IsString()
  departmentId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  programmeIds!: string[];
}

export class UpdateCourseDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  creditHours?: number;

  @IsOptional()
  @IsEnum(CourseStatus)
  status?: CourseStatus;
}

export class AssignLecturerDto {
  @IsString()
  lecturerId!: string;
}

export class AddStudentsDto {
  @IsArray()
  @IsString({ each: true })
  studentIds!: string[];
}
