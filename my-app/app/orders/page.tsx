"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getOrders, type OrderListItem } from "@/lib/api";
import { useSession } from "@/lib/useSession";
import { formatVnd, trangThaiLabel, TRANG_THAI_LIST } from "@/lib/labels";
import PageSizeSelect from "@/app/components/PageSizeSelect";

export default function OrdersPage() {
  const router = useRouter();
  const { user, loading: sessionLoading } = useSession();

  const [data, setData] = useState<OrderListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [trangThai, setTrangThai] = useState("");
  const [loading, setLoading] = useState(false);
  const [size, setSize] = useState(10);
  const [respSize, setRespSize] = useState(10);

  useEffect(() => {
    if (!sessionLoading && !user) router.push("/login");
  }, [sessionLoading, user, router]);

  const load = useCallback(async () => {
    try {
      const res = await getOrders({ page, size, trangThai: trangThai || undefined });
      setData(res.items);
      setTotal(res.total);
      setRespSize(res.size);
    } finally {
      setLoading(false);
    }
  }, [page, size, trangThai]);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  const totalPages = Math.max(1, Math.ceil(total / respSize));

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
      <h1 className="mb-4 text-2xl font-semibold">Đơn hàng</h1>

      <div className="mb-4">
        <select
          value={trangThai}
          onChange={(e) => {
            setPage(1);
            setTrangThai(e.target.value);
          }}
          className="ui-select rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/20"
        >
          <option value="">Tất cả trạng thái</option>
          {TRANG_THAI_LIST.map((t) => (
            <option key={t} value={t}>
              {trangThaiLabel(t)}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-lg border border-black/10 dark:border-white/15">
        <table className="w-full text-sm">
          <thead className="bg-black/[.03] text-left dark:bg-white/[.04]">
            <tr>
              <th className="p-3">Mã đơn</th>
              <th className="p-3">Trạng thái</th>
              <th className="p-3">Ngày hẹn</th>
              <th className="p-3 text-right">Thanh toán</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/10 dark:divide-white/10">
            {loading ? (
              <tr>
                <td colSpan={5} className="p-4 text-black/60 dark:text-white/60">
                  Đang tải...
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-4 text-black/60 dark:text-white/60">
                  Chưa có đơn nào.
                </td>
              </tr>
            ) : (
              data.map((o) => (
                <tr key={o.id} className="hover:bg-black/[.02] dark:hover:bg-white/[.03]">
                  <td className="p-3 font-medium">{o.maDon}</td>
                  <td className="p-3">
                    <span className="rounded bg-black/[.06] px-2 py-0.5 text-xs dark:bg-white/[.1]">
                      {trangThaiLabel(o.trangThai)}
                    </span>
                  </td>
                  <td className="p-3">{o.ngayHen}</td>
                  <td className="p-3 text-right">{formatVnd(o.thanhToan)}</td>
                  <td className="p-3 text-right">
                    <Link href={`/orders/${o.id}`} className="underline">
                      Chi tiết
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
        <span className="text-black/60 dark:text-white/60">
          Trang {page}/{totalPages} · {total} đơn
        </span>
        <div className="flex items-center gap-3">
          <PageSizeSelect
            value={size}
            onChange={(s) => {
              setPage(1);
              setSize(s);
            }}
          />
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-md border border-black/15 px-3 py-1 disabled:opacity-40 dark:border-white/20"
            >
              Trước
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-md border border-black/15 px-3 py-1 disabled:opacity-40 dark:border-white/20"
            >
              Sau
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
