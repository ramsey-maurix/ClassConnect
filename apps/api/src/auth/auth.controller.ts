import { Body, Controller, Get, Post, Req, Res } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { Request, Response } from "express";
import type { RequestWithUser } from "../common/request-with-user";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "./auth.constants";
import { AuthService } from "./auth.service";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { LoginDto } from "./dto/login.dto";
import { Public } from "./public.decorator";

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 8 } })
  @Post("login")
  login(@Body() dto: LoginDto, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    return this.auth.login(dto, request, response);
  }

  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  @Post("refresh")
  refresh(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    return this.auth.refresh(request.cookies?.[REFRESH_COOKIE] as string | undefined, request, response);
  }

  @Post("logout")
  async logout(@Req() request: RequestWithUser, @Res({ passthrough: true }) response: Response) {
    await this.auth.logout(
      request.cookies?.[REFRESH_COOKIE] as string | undefined,
      request.user.sub,
      request,
      response,
    );
  }

  @Get("me")
  async me(@Req() request: RequestWithUser) {
    return { user: await this.auth.me(request.user.sub) };
  }

  @Post("change-password")
  changePassword(@Req() request: RequestWithUser, @Body() dto: ChangePasswordDto) {
    return this.auth.changePassword(request.user.sub, dto);
  }
}
