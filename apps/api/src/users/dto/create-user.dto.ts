import { UserRole } from "@prisma/client";
import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from "class-validator";

export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  temporaryPassword!: string;

  @IsEnum(UserRole)
  role!: UserRole;

  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsOptional()
  @IsString()
  studentNumber?: string;

  @IsOptional()
  @IsString()
  staffNumber?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsString()
  departmentId!: string;

  @IsOptional()
  @IsString()
  programmeId?: string;
}
