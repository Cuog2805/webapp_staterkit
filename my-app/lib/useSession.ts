"use client";

import { useEffect, useState } from "react";
import { me, type UserDto } from "./api";
import { AUTH_CHANGED_EVENT, clearToken, getStoredUser, getToken, setStoredUser } from "./auth";

export interface Session {
  user: UserDto | null;
  loading: boolean;
}

/** Đọc phiên đăng nhập hiện tại; xác thực token với /api/auth/me khi mount. */
export function useSession(): Session {
  const [user, setUser] = useState<UserDto | null>(() => getStoredUser());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!getToken()) {
        if (active) {
          setUser(null);
          setLoading(false);
        }
        return;
      }
      try {
        const u = await me();
        if (active) {
          setUser(u);
          setStoredUser(u);
        }
      } catch {
        clearToken();
        if (active) setUser(null);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  // Cập nhật ngay khi đăng nhập/đăng xuất (cùng tab qua sự kiện tùy biến, khác tab qua 'storage').
  useEffect(() => {
    function sync() {
      setUser(getStoredUser());
    }
    window.addEventListener(AUTH_CHANGED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(AUTH_CHANGED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return { user, loading };
}
