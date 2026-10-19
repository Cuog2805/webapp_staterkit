"use client";

import Link from "next/link";
import { useSession } from "@/lib/useSession";

export default function Home() {
  const { user } = useSession();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-start justify-center gap-6 px-6 py-20">
      <h1 className="text-3xl font-semibold tracking-tight">VNPT Ninh Bình Solutions</h1>
      <p className="max-w-xl text-black/70 dark:text-white/70">
        Cổng đăng ký các giải pháp CNTT: chữ ký số, hóa đơn điện tử, camera AI, hạ tầng cloud và
        phần mềm quản lý. Khách hàng tạo đơn, điều hành viên tiếp nhận &amp; phân công, kỹ thuật viên
        triển khai.
      </p>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/solutions"
          className="rounded-md bg-foreground px-5 py-2.5 font-medium text-background hover:opacity-90"
        >
          Xem danh mục giải pháp
        </Link>
        {user ? (
          <Link
            href="/orders"
            className="rounded-md border border-black/15 px-5 py-2.5 font-medium hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
          >
            Đơn hàng
          </Link>
        ) : (
          <Link
            href="/login"
            className="rounded-md border border-black/15 px-5 py-2.5 font-medium hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
          >
            Đăng nhập
          </Link>
        )}
      </div>
    </main>
  );
}
