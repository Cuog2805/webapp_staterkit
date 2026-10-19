"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getOrder,
  getTechnicians,
  transitionOrder,
  type OrderDetail,
  type UserDto,
} from "@/lib/api";
import { useSession } from "@/lib/useSession";
import { formatVnd, nhomLabel, trangThaiLabel } from "@/lib/labels";

interface ActionDef {
  label: string;
  denTrangThai: string;
  needsReason?: boolean;
  needsKtv?: boolean;
}

/** Các hành động chuyển trạng thái khả dụng theo vai trò + trạng thái + quyền sở hữu. */
function availableActions(order: OrderDetail, user: UserDto): ActionDef[] {
  const owner = order.khachHangId === user.id;
  const assigned = order.ktvId === user.id;
  switch (user.vaiTro) {
    case "DIEU_HANH":
      if (order.trangThai === "MOI")
        return [
          { label: "Tiếp nhận", denTrangThai: "DA_TIEP_NHAN" },
          { label: "Hủy đơn", denTrangThai: "HUY", needsReason: true },
        ];
      if (order.trangThai === "DA_TIEP_NHAN")
        return [
          { label: "Phân công & triển khai", denTrangThai: "DANG_TRIEN_KHAI", needsKtv: true },
          { label: "Hủy đơn", denTrangThai: "HUY", needsReason: true },
        ];
      return [];
    case "KHACH_HANG":
      if (owner && order.trangThai === "MOI")
        return [{ label: "Hủy đơn", denTrangThai: "HUY", needsReason: true }];
      return [];
    case "KY_THUAT":
      if (assigned && order.trangThai === "DANG_TRIEN_KHAI")
        return [{ label: "Hoàn tất", denTrangThai: "HOAN_TAT" }];
      return [];
    default:
      return [];
  }
}

export default function OrderDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const { user, loading: sessionLoading } = useSession();

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const [active, setActive] = useState<ActionDef | null>(null);
  const [lyDo, setLyDo] = useState("");
  const [ktvId, setKtvId] = useState<number | "">("");
  const [technicians, setTechnicians] = useState<UserDto[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const o = await getOrder(id);
      setOrder(o);
      setNotFound(false);
    } catch (err) {
      if (err && typeof err === "object" && "status" in err && (err as { status: number }).status === 404) {
        setNotFound(true);
      } else {
        setError(err instanceof Error ? err.message : "Lỗi tải đơn.");
      }
    }
  }, [id]);

  useEffect(() => {
    if (!sessionLoading && !user) router.push("/login");
  }, [sessionLoading, user, router]);

  useEffect(() => {
    // Nạp chi tiết đơn khi mount (fetch-on-mount) — setState sau await, không gây cascading render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (user) void load();
  }, [user, load]);

  useEffect(() => {
    if (user?.vaiTro === "DIEU_HANH") getTechnicians().then(setTechnicians).catch(() => {});
  }, [user]);

  async function runAction() {
    if (!active || !order) return;
    setError(null);
    setBusy(true);
    try {
      await transitionOrder(order.id, {
        denTrangThai: active.denTrangThai,
        ktvId: active.needsKtv ? Number(ktvId) : undefined,
        lyDo: active.needsReason ? lyDo : undefined,
        version: order.version,
      });
      setActive(null);
      setLyDo("");
      setKtvId("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chuyển trạng thái thất bại.");
    } finally {
      setBusy(false);
    }
  }

  if (notFound) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
        <p className="rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
          Không tìm thấy đơn (hoặc bạn không có quyền xem).
        </p>
      </main>
    );
  }

  if (!order) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8 text-sm text-black/60 dark:text-white/60">
        Đang tải...
      </main>
    );
  }

  const actions = user ? availableActions(order, user) : [];

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-6 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Đơn {order.maDon}</h1>
        <span className="rounded bg-black/[.06] px-2 py-1 text-sm dark:bg-white/[.1]">
          {trangThaiLabel(order.trangThai)}
        </span>
      </div>

      {error && (
        <p className="rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <section className="grid gap-2 rounded-lg border border-black/10 p-4 text-sm dark:border-white/15">
        <div className="flex justify-between">
          <span className="text-black/60 dark:text-white/60">Khách hàng</span>
          <span>{order.khachHangTen ?? order.khachHangId}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-black/60 dark:text-white/60">Kỹ thuật viên</span>
          <span>{order.ktvTen ?? "— chưa phân công —"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-black/60 dark:text-white/60">Địa chỉ</span>
          <span>{order.diaChi}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-black/60 dark:text-white/60">Ngày hẹn</span>
          <span>{order.ngayHen}</span>
        </div>
      </section>

      {/* Dòng đơn */}
      <section className="overflow-hidden rounded-lg border border-black/10 dark:border-white/15">
        <table className="w-full text-sm">
          <thead className="bg-black/[.03] text-left dark:bg-white/[.04]">
            <tr>
              <th className="p-3">Giải pháp</th>
              <th className="p-3">Nhóm</th>
              <th className="p-3 text-right">Đơn giá</th>
              <th className="p-3 text-right">SL</th>
              <th className="p-3 text-right">Thành tiền</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/10 dark:divide-white/10">
            {order.dong.map((d, i) => (
              <tr key={i}>
                <td className="p-3">{d.ten}</td>
                <td className="p-3">{nhomLabel(d.nhom)}</td>
                <td className="p-3 text-right">{formatVnd(d.donGia)}</td>
                <td className="p-3 text-right">{d.soLuong}</td>
                <td className="p-3 text-right">{formatVnd(d.thanhTien)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="space-y-1 border-t border-black/10 p-4 text-sm dark:border-white/10">
          <div className="flex justify-between">
            <span>Tổng tiền</span>
            <span>{formatVnd(order.tongTien)}</span>
          </div>
          <div className="flex justify-between text-black/60 dark:text-white/60">
            <span>
              Ưu đãi
              {order.tongTien > 0 && order.giamGia > 0
                ? ` (${Math.round((order.giamGia / order.tongTien) * 100)}%)`
                : ""}
            </span>
            <span>-{formatVnd(order.giamGia)}</span>
          </div>
          <div className="flex justify-between font-semibold">
            <span>Thanh toán</span>
            <span>{formatVnd(order.thanhToan)}</span>
          </div>
        </div>
      </section>

      {/* Hành động chuyển trạng thái */}
      {actions.length > 0 && (
        <section className="space-y-3 rounded-lg border border-black/10 p-4 dark:border-white/15">
          <h2 className="font-semibold">Thao tác</h2>
          <div className="flex flex-wrap gap-2">
            {actions.map((a) => (
              <button
                key={a.denTrangThai}
                onClick={() => {
                  setActive(a);
                  setError(null);
                }}
                className={`rounded-md border px-3 py-1.5 text-sm ${
                  active?.denTrangThai === a.denTrangThai
                    ? "border-foreground bg-foreground text-background"
                    : "border-black/15 hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>

          {active && (
            <div className="space-y-3 border-t border-black/10 pt-3 dark:border-white/10">
              {active.needsKtv && (
                <div className="space-y-1">
                  <label className="text-sm font-medium">Chọn kỹ thuật viên</label>
                  <select
                    value={ktvId}
                    onChange={(e) => setKtvId(e.target.value ? Number(e.target.value) : "")}
                    className="ui-select w-full rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/20"
                  >
                    <option value="">— chọn —</option>
                    {technicians.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.hoTen ?? t.soDienThoai} (#{t.id})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {active.needsReason && (
                <div className="space-y-1">
                  <label className="text-sm font-medium">Lý do</label>
                  <textarea
                    value={lyDo}
                    onChange={(e) => setLyDo(e.target.value)}
                    className="w-full rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/20"
                  />
                </div>
              )}
              <button
                onClick={runAction}
                disabled={busy || (active.needsKtv && !ktvId) || (active.needsReason && !lyDo)}
                className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50"
              >
                {busy ? "Đang xử lý..." : `Xác nhận: ${active.label}`}
              </button>
            </div>
          )}
        </section>
      )}

      {/* Lịch sử */}
      <section className="rounded-lg border border-black/10 p-4 dark:border-white/15">
        <h2 className="mb-3 font-semibold">Lịch sử trạng thái</h2>
        <ol className="space-y-2 text-sm">
          {order.lichSu.map((h, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="text-black/50 dark:text-white/50">{new Date(h.thoiGian).toLocaleString("vi-VN")}</span>
              <span>
                {h.tuTrangThai ? `${trangThaiLabel(h.tuTrangThai)} → ` : ""}
                <strong>{trangThaiLabel(h.denTrangThai)}</strong>
                {h.lyDo ? ` · ${h.lyDo}` : ""}
              </span>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
