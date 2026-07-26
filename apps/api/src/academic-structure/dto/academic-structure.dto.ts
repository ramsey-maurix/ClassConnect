import { IsString } from "class-validator";

export class CreateFacultyDto {
  @IsString()
  code!: string;

  @IsString()
  name!: string;
}

export class CreateDepartmentDto {
  @IsString()
  facultyId!: string;

  @IsString()
  code!: string;

  @IsString()
  name!: string;
}
