// Lưu trữ token + thông tin người dùng phía client.
// Lưu ý: dùng localStorage cho đơn giản ở starter kit. Cách này dễ bị XSS hơn
// so với HttpOnly cookie — có thể nâng cấp sang cookie khi cần bảo mật cao hơn.

import type { UserDto } from "./api";

const TOKEN_KEY = "auth_token";
const USER_KEY = "auth_user";

/** Tên sự kiện báo phiên đăng nhập thay đổi (để Nav/các component cập nhật ngay). */
export const AUTH_CHANGED_EVENT = "auth-changed";

function notifyAuthChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function getStoredUser(): UserDto | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UserDto;
  } catch {
    return null;
  }
}

export function setStoredUser(user: UserDto): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
}

/** Lưu phiên đăng nhập (token + user) sau login/register. */
export function saveSession(token: string, user: UserDto): void {
  setToken(token);
  setStoredUser(user);
  notifyAuthChanged();
}

export function clearToken(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
  notifyAuthChanged();
}
