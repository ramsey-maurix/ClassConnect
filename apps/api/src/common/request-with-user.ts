import type { Request } from "express";
import type { AuthUser } from "./auth-user";

export type RequestWithUser = Request & { user: AuthUser };
