import { AttendanceMethod, AttendanceStatus } from "@prisma/client";
import { IsEnum, IsInt, IsLatitude, IsLongitude, IsNumber, IsOptional, IsString, Max, Min } from "class-validator";

export class CreateAttendanceSessionDto {
  @IsString()
  courseId!: string;

  @IsLatitude()
  latitude!: number;

  @IsLongitude()
  longitude!: number;

  @IsInt()
  @Min(10)
  @Max(1000)
  radiusMetres!: number;

  @IsInt()
  @Min(5)
  @Max(360)
  durationMinutes!: number;

  @IsInt()
  @Min(0)
  @Max(120)
  lateAfterMinutes!: number;

  @IsEnum(AttendanceMethod)
  method!: AttendanceMethod;
}

export class MarkAttendanceDto {
  @IsOptional()
  @IsString()
  pin?: string;

  @IsOptional()
  @IsString()
  qrToken?: string;

  @IsLatitude()
  latitude!: number;

  @IsLongitude()
  longitude!: number;

  @IsNumber()
  @Min(0)
  accuracy!: number;
}

export class UpdateAttendanceRecordDto {
  @IsEnum(AttendanceStatus)
  status!: AttendanceStatus;

  @IsString()
  reason!: string;
}
