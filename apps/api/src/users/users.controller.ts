import { Body, Controller, Get, Param, Patch, Post, Query, Req } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { ApiCookieAuth, ApiParam, ApiQuery, ApiTags } from "@nestjs/swagger";
import type { RequestWithUser } from "../common/request-with-user";
import { Roles } from "../auth/roles.decorator";
import { CreateUserDto } from "./dto/create-user.dto";
import { ResetPasswordDto, UpdateUserDto, UpdateUserStatusDto } from "./dto/update-user.dto";
import { UsersService } from "./users.service";

@Roles(UserRole.ADMIN)
@Controller("users")
@ApiTags("Users")
@ApiCookieAuth("classconnect_access")
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @ApiQuery({ name: "q", required: false, description: "Search by name, email, student number, or staff number" })
  @ApiQuery({ name: "role", required: false, enum: UserRole })
  list(@Query("q") query?: string, @Query("role") role?: UserRole) {
    return this.users.list(query, role);
  }

  @Post()
  create(@Body() dto: CreateUserDto, @Req() request: RequestWithUser) {
    return this.users.create(dto, request.user.sub, request.ip);
  }

  @Get(":id")
  @ApiParam({ name: "id", description: "User ID" })
  get(@Param("id") id: string) {
    return this.users.get(id);
  }

  @Patch(":id")
  @ApiParam({ name: "id", description: "User ID" })
  update(@Param("id") id: string, @Body() dto: UpdateUserDto) {
    return this.users.update(id, dto);
  }

  @Patch(":id/status")
  @ApiParam({ name: "id", description: "User ID" })
  updateStatus(@Param("id") id: string, @Body() dto: UpdateUserStatusDto, @Req() request: RequestWithUser) {
    return this.users.updateStatus(id, dto, request.user.sub, request.ip);
  }

  @Post(":id/reset-password")
  @ApiParam({ name: "id", description: "User ID" })
  resetPassword(@Param("id") id: string, @Body() dto: ResetPasswordDto, @Req() request: RequestWithUser) {
    return this.users.resetPassword(id, dto, request.user.sub, request.ip);
  }
}
