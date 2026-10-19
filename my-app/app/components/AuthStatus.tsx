"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { me, type UserDto } from "@/lib/api";
import { clearToken, getToken } from "@/lib/auth";

export default function AuthStatus() {
  const [user, setUser] = useState<UserDto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function loadUser() {
      if (!getToken()) {
        if (active) setLoading(false);
        return;
      }
      try {
        const u = await me();
        if (active) setUser(u);
      } catch {
        clearToken();
      } finally {
        if (active) setLoading(false);
      }
    }
    loadUser();
    return () => {
      active = false;
    };
  }, []);

  function handleLogout() {
    clearToken();
    setUser(null);
  }

  if (loading) return null;

  return (
    <div className="flex items-center gap-3 text-sm">
      {user ? (
        <>
          <span className="text-black/70 dark:text-white/70">
            {user.displayName ?? user.email}
          </span>
          <button
            onClick={handleLogout}
            className="rounded-md border border-black/15 px-3 py-1 hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
          >
            Đăng xuất
          </button>
        </>
      ) : (
        <>
          <Link href="/login" className="underline">
            Đăng nhập
          </Link>
          <Link href="/register" className="underline">
            Đăng ký
          </Link>
        </>
      )}
    </div>
  );
}
