"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createOrder, getSolutions, type SolutionDto } from "@/lib/api";
import { useSession } from "@/lib/useSession";
import { formatVnd, laChuNhat, ngayHenBounds, nhomLabel, NHOM_LIST, phanTramUuDai } from "@/lib/labels";
import PageSizeSelect from "@/app/components/PageSizeSelect";

interface CartLine {
  sol: SolutionDto;
  soLuong: number;
}

/** Tạm tính ưu đãi phía client (xem trước) — logic chuẩn vẫn do backend quyết định. */
function tinhGiamGia(tong: number, soNhom: number): number {
  if (soNhom >= 3) return Math.round(tong * 0.1);
  if (soNhom === 2) return Math.round(tong * 0.05);
  return 0;
}

export default function SolutionsPage() {
  const router = useRouter();
  const { user } = useSession();

  const [data, setData] = useState<SolutionDto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [nhom, setNhom] = useState("");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [size, setSize] = useState(10);
  const [respSize, setRespSize] = useState(10);

  const [cart, setCart] = useState<CartLine[]>([]);
  const [diaChi, setDiaChi] = useState("");
  const [ngayHen, setNgayHen] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [bounds, setBounds] = useState<{ min: string; max: string }>({ min: "", max: "" });
  const idemKey = useRef<string>("");

  // Tính min/max ngày hẹn phía client (tránh đọc thời gian hiện tại lúc prerender).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBounds(ngayHenBounds());
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await getSolutions({ page, size, nhom: nhom || undefined, q: q || undefined });
      setData(res.items);
      setTotal(res.total);
      setRespSize(res.size);
    } finally {
      setLoading(false);
    }
  }, [page, size, nhom, q]);

  useEffect(() => {
    load();
  }, [load]);

  function addToCart(sol: SolutionDto) {
    setCart((prev) => {
      const found = prev.find((l) => l.sol.id === sol.id);
      if (found) return prev.map((l) => (l.sol.id === sol.id ? { ...l, soLuong: Math.min(100, l.soLuong + 1) } : l));
      return [...prev, { sol, soLuong: 1 }];
    });
  }

  function setQty(id: number, soLuong: number) {
    setCart((prev) => prev.map((l) => (l.sol.id === id ? { ...l, soLuong } : l)));
  }

  function removeLine(id: number) {
    setCart((prev) => prev.filter((l) => l.sol.id !== id));
  }

  const tongTien = cart.reduce((s, l) => s + l.sol.donGia * l.soLuong, 0);
  const soNhom = new Set(cart.map((l) => l.sol.nhom)).size;
  const giamGia = tinhGiamGia(tongTien, soNhom);
  const thanhToan = tongTien - giamGia;

  const totalPages = Math.max(1, Math.ceil(total / respSize));

  async function submitOrder() {
    setError(null);
    setOk(null);
    if (cart.length < 1 || cart.length > 5) {
      setError("Đơn phải có từ 1 đến 5 dòng.");
      return;
    }
    if (!idemKey.current) idemKey.current = crypto.randomUUID();
    setSubmitting(true);
    try {
      const order = await createOrder(
        { dong: cart.map((l) => ({ giaiPhapId: l.sol.id, soLuong: l.soLuong })), diaChi, ngayHen },
        idemKey.current,
      );
      setOk(`Đã tạo đơn ${order.maDon}.`);
      setCart([]);
      setDiaChi("");
      setNgayHen("");
      idemKey.current = crypto.randomUUID();
      router.push(`/orders/${order.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tạo đơn thất bại.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto grid w-full max-w-6xl flex-1 gap-8 px-6 py-8 lg:grid-cols-[1fr_360px]">
      {/* Danh mục */}
      <section>
        <h1 className="mb-4 text-2xl font-semibold">Danh mục giải pháp</h1>

        <div className="mb-4 flex flex-wrap gap-2">
          <select
            value={nhom}
            onChange={(e) => {
              setPage(1);
              setNhom(e.target.value);
            }}
            className="ui-select rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/20"
          >
            <option value="">Tất cả nhóm</option>
            {NHOM_LIST.map((n) => (
              <option key={n} value={n}>
                {nhomLabel(n)}
              </option>
            ))}
          </select>
          <input
            placeholder="Tìm theo tên / mã..."
            value={q}
            onChange={(e) => {
              setPage(1);
              setQ(e.target.value);
            }}
            className="flex-1 rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/20"
          />
        </div>

        <div className="divide-y divide-black/10 rounded-lg border border-black/10 dark:divide-white/10 dark:border-white/15">
          {loading ? (
            <p className="p-4 text-sm text-black/60 dark:text-white/60">Đang tải...</p>
          ) : data.length === 0 ? (
            <p className="p-4 text-sm text-black/60 dark:text-white/60">Không có giải pháp nào.</p>
          ) : (
            data.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-3 p-4">
                <div>
                  <div className="font-medium">{s.ten}</div>
                  <div className="text-sm text-black/60 dark:text-white/60">
                    {s.ma} · {nhomLabel(s.nhom)} · {formatVnd(s.donGia)}
                  </div>
                </div>
                <button
                  onClick={() => addToCart(s)}
                  className="rounded-md border border-black/15 px-3 py-1.5 text-sm hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
                >
                  + Thêm
                </button>
              </div>
            ))
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
          <span className="text-black/60 dark:text-white/60">
            Trang {page}/{totalPages} · {total} giải pháp
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
      </section>

      {/* Giỏ / tạo đơn */}
      <aside className="h-fit rounded-xl border border-black/10 p-5 dark:border-white/15">
        <h2 className="mb-3 text-lg font-semibold">Đơn đăng ký</h2>

        {cart.length === 0 ? (
          <p className="text-sm text-black/60 dark:text-white/60">Chưa chọn giải pháp nào.</p>
        ) : (
          <div className="space-y-3">
            {cart.map((l) => (
              <div key={l.sol.id} className="flex items-center gap-2 text-sm">
                <div className="flex-1">
                  <div className="font-medium">{l.sol.ten}</div>
                  <div className="text-black/60 dark:text-white/60">{formatVnd(l.sol.donGia)}</div>
                </div>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={l.soLuong}
                  onChange={(e) => setQty(l.sol.id, Math.max(1, Math.min(100, Number(e.target.value))))}
                  className="w-16 rounded-md border border-black/15 bg-transparent px-2 py-1 dark:border-white/20"
                />
                <button onClick={() => removeLine(l.sol.id)} className="text-red-600 dark:text-red-400">
                  ✕
                </button>
              </div>
            ))}

            <div className="space-y-1 border-t border-black/10 pt-3 text-sm dark:border-white/10">
              <div className="flex justify-between">
                <span>Tổng tiền</span>
                <span>{formatVnd(tongTien)}</span>
              </div>
              <div className="flex justify-between text-black/60 dark:text-white/60">
                <span>Ưu đãi ({soNhom} nhóm · {phanTramUuDai(soNhom)}%)</span>
                <span>-{formatVnd(giamGia)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Tạm tính</span>
                <span>{formatVnd(thanhToan)}</span>
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 space-y-3">
          <div className="space-y-1">
            <label className="text-sm font-medium">Địa chỉ khảo sát</label>
            <input
              value={diaChi}
              onChange={(e) => setDiaChi(e.target.value)}
              className="w-full rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/20"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Ngày hẹn khảo sát</label>
            <input
              type="date"
              value={ngayHen}
              min={bounds.min}
              max={bounds.max}
              onChange={(e) => setNgayHen(e.target.value)}
              className="w-full rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/20"
            />
            <p className="text-xs text-black/50 dark:text-white/50">Từ 2–30 ngày tới, không vào Chủ nhật.</p>
            {ngayHen && laChuNhat(ngayHen) && (
              <p className="text-xs text-red-600 dark:text-red-400">Ngày hẹn không được vào Chủ nhật.</p>
            )}
          </div>

          {error && (
            <p className="rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
          {ok && (
            <p className="rounded-md bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-400">{ok}</p>
          )}

          {!user ? (
            <p className="text-sm text-black/60 dark:text-white/60">Đăng nhập (khách hàng) để tạo đơn.</p>
          ) : user.vaiTro !== "KHACH_HANG" ? (
            <p className="text-sm text-black/60 dark:text-white/60">Chỉ khách hàng mới tạo được đơn.</p>
          ) : (
            <button
              onClick={submitOrder}
              disabled={submitting || cart.length === 0 || !diaChi || !ngayHen || laChuNhat(ngayHen)}
              className="w-full rounded-md bg-foreground py-2.5 font-medium text-background hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? "Đang tạo đơn..." : "Tạo đơn"}
            </button>
          )}
        </div>
      </aside>
    </main>
  );
}
