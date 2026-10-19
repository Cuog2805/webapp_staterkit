"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearToken } from "@/lib/auth";
import { useSession } from "@/lib/useSession";
import { VAI_TRO_LABEL } from "@/lib/labels";

export default function Nav() {
  const { user, loading } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  function handleLogout() {
    clearToken();
    router.push("/login");
    router.refresh();
  }

  const link = (href: string, label: string) => (
    <Link
      href={href}
      className={`rounded-md px-3 py-1.5 text-sm transition-colors hover:bg-black/5 dark:hover:bg-white/10 ${
        pathname === href ? "font-semibold text-foreground" : "text-black/70 dark:text-white/70"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <nav className="flex items-center justify-between gap-4 border-b border-black/10 px-6 py-3 dark:border-white/15">
      <div className="flex items-center gap-1">
        <Link href="/" className="mr-2 font-semibold tracking-tight">
          VNPT Ninh Bình Solutions
        </Link>
        {link("/solutions", "Giải pháp")}
        {user && link("/orders", "Đơn hàng")}
        {user?.vaiTro === "DIEU_HANH" && link("/reports", "Báo cáo")}
      </div>

      <div className="flex items-center gap-3 text-sm">
        {loading ? null : user ? (
          <>
            <span className="text-black/70 dark:text-white/70">
              {user.hoTen ?? user.soDienThoai}{" "}
              <span className="rounded bg-black/[.06] px-1.5 py-0.5 text-xs dark:bg-white/[.1]">
                {VAI_TRO_LABEL[user.vaiTro] ?? user.vaiTro}
              </span>
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
    </nav>
  );
}
