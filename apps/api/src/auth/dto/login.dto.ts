import { IsBoolean, IsOptional, IsString, MinLength } from "class-validator";

export class LoginDto {
  @IsString()
  @MinLength(3)
  identifier!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;
}
