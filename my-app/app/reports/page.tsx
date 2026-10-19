"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getReportSummary, type ReportSummary } from "@/lib/api";
import { useSession } from "@/lib/useSession";
import { formatVnd, nhomLabel, trangThaiLabel } from "@/lib/labels";

export default function ReportsPage() {
  const router = useRouter();
  const { user, loading: sessionLoading } = useSession();

  const [data, setData] = useState<ReportSummary | null>(null);
  const [tuNgay, setTuNgay] = useState("");
  const [denNgay, setDenNgay] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (sessionLoading) return;
    if (!user) router.push("/login");
    else if (user.vaiTro !== "DIEU_HANH") router.push("/");
  }, [sessionLoading, user, router]);

  const load = useCallback(async () => {
    const res = await getReportSummary({
      tuNgay: tuNgay || undefined,
      denNgay: denNgay || undefined,
    }).then(
      (r) => ({ r, e: null as string | null }),
      (err: unknown) => ({ r: null, e: err instanceof Error ? err.message : "Lỗi tải báo cáo." }),
    );
    setData(res.r);
    setError(res.e);
  }, [tuNgay, denNgay]);

  useEffect(() => {
    // Nạp dữ liệu khi mount (fetch-on-mount) — setState xảy ra sau await, không gây cascading render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (user) void load();
  }, [user, load]);

  if (user?.vaiTro !== "DIEU_HANH") return null;

  const maxRevenue = data ? Math.max(1, ...data.doanhThuTheoNhom.map((r) => r.doanhThu)) : 1;

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 px-6 py-8">
      <h1 className="text-2xl font-semibold">Báo cáo tổng hợp</h1>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label className="text-sm font-medium">Từ ngày</label>
          <input
            type="date"
            value={tuNgay}
            onChange={(e) => setTuNgay(e.target.value)}
            className="block rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/20"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Đến ngày</label>
          <input
            type="date"
            value={denNgay}
            onChange={(e) => setDenNgay(e.target.value)}
            className="block rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/20"
          />
        </div>
        <button
          onClick={load}
          className="rounded-md border border-black/15 px-4 py-2 text-sm hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
        >
          Lọc
        </button>
      </div>

      {error && (
        <p className="rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-black/10 p-4 dark:border-white/15">
              <div className="text-sm text-black/60 dark:text-white/60">Tổng số đơn</div>
              <div className="text-2xl font-semibold">{data.tongSoDon}</div>
            </div>
            <div className="rounded-lg border border-black/10 p-4 dark:border-white/15">
              <div className="text-sm text-black/60 dark:text-white/60">Tỷ lệ hủy</div>
              <div className="text-2xl font-semibold">{data.tyLeHuy}%</div>
            </div>
            <div className="rounded-lg border border-black/10 p-4 dark:border-white/15">
              <div className="text-sm text-black/60 dark:text-white/60">Doanh thu dự kiến</div>
              <div className="text-2xl font-semibold">
                {formatVnd(data.doanhThuTheoNhom.reduce((s, r) => s + r.doanhThu, 0))}
              </div>
            </div>
          </div>

          <section className="rounded-lg border border-black/10 p-4 dark:border-white/15">
            <h2 className="mb-3 font-semibold">Số đơn theo trạng thái</h2>
            <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-5">
              {data.soDonTheoTrangThai.map((s) => (
                <div key={s.trangThai} className="rounded-md bg-black/[.03] p-3 text-center dark:bg-white/[.04]">
                  <div className="text-xl font-semibold">{s.soLuong}</div>
                  <div className="text-xs text-black/60 dark:text-white/60">{trangThaiLabel(s.trangThai)}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-black/10 p-4 dark:border-white/15">
            <h2 className="mb-3 font-semibold">Doanh thu dự kiến theo nhóm (không tính đơn hủy)</h2>
            <div className="space-y-2">
              {data.doanhThuTheoNhom.map((r) => (
                <div key={r.nhom} className="text-sm">
                  <div className="mb-1 flex justify-between">
                    <span>{nhomLabel(r.nhom)}</span>
                    <span className="font-medium">{formatVnd(r.doanhThu)}</span>
                  </div>
                  <div className="h-2 rounded bg-black/[.06] dark:bg-white/[.1]">
                    <div
                      className="h-2 rounded bg-foreground"
                      style={{ width: `${(r.doanhThu / maxRevenue) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
