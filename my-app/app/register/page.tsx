"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { register } from "@/lib/api";
import { saveSession } from "@/lib/auth";

export default function RegisterPage() {
  const router = useRouter();
  const [soDienThoai, setSoDienThoai] = useState("");
  const [hoTen, setHoTen] = useState("");
  const [matKhau, setMatKhau] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await register({ soDienThoai, matKhau, hoTen });
      saveSession(res.token, res.user);
      router.push("/orders");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đăng ký thất bại.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 rounded-xl border border-black/10 p-6 shadow-sm dark:border-white/15"
      >
        <h1 className="text-2xl font-semibold">Đăng ký</h1>
        <p className="text-sm text-black/60 dark:text-white/60">
          Tài khoản đăng ký mới là <strong>Khách hàng</strong>.
        </p>

        {error && (
          <p className="rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}

        <div className="space-y-1">
          <label htmlFor="hoTen" className="text-sm font-medium">
            Họ và tên
          </label>
          <input
            id="hoTen"
            type="text"
            required
            value={hoTen}
            onChange={(e) => setHoTen(e.target.value)}
            className="w-full rounded-md border border-black/15 bg-transparent px-3 py-2 outline-none focus:border-foreground dark:border-white/20"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="soDienThoai" className="text-sm font-medium">
            Số điện thoại
          </label>
          <input
            id="soDienThoai"
            type="text"
            required
            value={soDienThoai}
            onChange={(e) => setSoDienThoai(e.target.value)}
            className="w-full rounded-md border border-black/15 bg-transparent px-3 py-2 outline-none focus:border-foreground dark:border-white/20"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="matKhau" className="text-sm font-medium">
            Mật khẩu
          </label>
          <input
            id="matKhau"
            type="password"
            required
            minLength={6}
            value={matKhau}
            onChange={(e) => setMatKhau(e.target.value)}
            className="w-full rounded-md border border-black/15 bg-transparent px-3 py-2 outline-none focus:border-foreground dark:border-white/20"
          />
          <p className="text-xs text-black/50 dark:text-white/50">Tối thiểu 6 ký tự.</p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-foreground py-2 font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Đang tạo tài khoản..." : "Đăng ký"}
        </button>

        <p className="text-center text-sm text-black/60 dark:text-white/60">
          Đã có tài khoản?{" "}
          <Link href="/login" className="underline">
            Đăng nhập
          </Link>
        </p>
      </form>
    </main>
  );
}
