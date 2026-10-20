// Client gọi API backend (ASP.NET) cho chức năng auth.
// JWT được lưu trong HttpOnly cookie do backend đặt; mọi request dùng
// credentials: "include" để trình duyệt tự gửi/nhận cookie đó.

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5055";

export interface UserDto {
  id: number;
  email: string;
  displayName: string | null;
}

export interface RegisterInput {
  email: string;
  password: string;
  displayName?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

class ApiError extends Error {}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.message) message = body.message;
    } catch {
      // response không phải JSON — giữ message mặc định
    }
    throw new ApiError(message);
  }

  // 204 No Content (vd: logout) — không có body để parse.
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export function register(input: RegisterInput): Promise<UserDto> {
  return request<UserDto>("/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function login(input: LoginInput): Promise<UserDto> {
  return request<UserDto>("/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function me(): Promise<UserDto> {
  return request<UserDto>("/auth/me");
}

export function logout(): Promise<void> {
  return request<void>("/auth/logout", { method: "POST" });
}
