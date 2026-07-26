import type { SessionUser } from "../types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init.headers,
    },
  });

  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      typeof payload === "object" && payload && "message" in payload
        ? String(payload.message)
        : `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status, payload);
  }

  return payload as T;
}

export const authApi = {
  login: (body: { identifier: string; password: string; rememberMe: boolean }) =>
    apiRequest<{ user: SessionUser }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  me: () => apiRequest<{ user: SessionUser }>("/auth/me"),
  logout: () => apiRequest<void>("/auth/logout", { method: "POST" }),
  changePassword: (body: { currentPassword: string; newPassword: string }) =>
    apiRequest<{ message: string }>("/auth/change-password", {
      method: "POST",
      body: JSON.stringify(body),
    }),
};

/*
  Authentication boundary:
  - The NestJS API should set short-lived access and refresh JWTs as Secure,
    HttpOnly, SameSite cookies.
  - The browser never reads or stores the token in localStorage/sessionStorage.
  - All frontend requests use credentials: "include".
  - Backend guards remain the source of truth for authorization.
*/
