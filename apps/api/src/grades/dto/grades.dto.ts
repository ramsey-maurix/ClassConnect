import { AssessmentType } from "@prisma/client";
import { IsArray, IsEnum, IsNumber, IsString, Max, Min, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

export class CreateAssessmentDto {
  @IsString()
  courseId!: string;

  @IsString()
  title!: string;

  @IsEnum(AssessmentType)
  type!: AssessmentType;

  @IsNumber()
  @Min(1)
  maximumMark!: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  weight!: number;
}

class GradeEntryDto {
  @IsString()
  studentId!: string;

  @IsNumber()
  @Min(0)
  rawMark!: number;
}

export class SaveGradesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GradeEntryDto)
  grades!: GradeEntryDto[];
}

export class CorrectGradeDto {
  @IsNumber()
  @Min(0)
  rawMark!: number;

  @IsString()
  reason!: string;
}
