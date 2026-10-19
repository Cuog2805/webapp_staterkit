// Nhãn hiển thị tiếng Việt cho enum + tiện ích định dạng.

export const NHOM_LABEL: Record<string, string> = {
  CHU_KY_SO: "Chữ ký số",
  HOA_DON_DT: "Hóa đơn điện tử",
  CAMERA_AI: "Camera AI",
  CLOUD: "Hạ tầng Cloud",
  PHAN_MEM: "Phần mềm quản lý",
};

export const TRANG_THAI_LABEL: Record<string, string> = {
  MOI: "Mới",
  DA_TIEP_NHAN: "Đã tiếp nhận",
  DANG_TRIEN_KHAI: "Đang triển khai",
  HOAN_TAT: "Hoàn tất",
  HUY: "Hủy",
};

export const VAI_TRO_LABEL: Record<string, string> = {
  KHACH_HANG: "Khách hàng",
  DIEU_HANH: "Điều hành viên",
  KY_THUAT: "Kỹ thuật viên",
};

export const NHOM_LIST = Object.keys(NHOM_LABEL);
export const TRANG_THAI_LIST = Object.keys(TRANG_THAI_LABEL);

export function formatVnd(amount: number): string {
  return amount.toLocaleString("vi-VN") + "đ";
}

export function nhomLabel(n: string): string {
  return NHOM_LABEL[n] ?? n;
}

export function trangThaiLabel(t: string): string {
  return TRANG_THAI_LABEL[t] ?? t;
}

/** Phần trăm ưu đãi theo số nhóm giải pháp khác nhau (2 nhóm → 5%, ≥3 nhóm → 10%). */
export function phanTramUuDai(soNhom: number): number {
  if (soNhom >= 3) return 10;
  if (soNhom === 2) return 5;
  return 0;
}

/** Các lựa chọn số dòng mỗi trang. */
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Khoảng ngày hẹn khảo sát hợp lệ: 2–30 ngày kể từ hôm nay. */
export function ngayHenBounds(): { min: string; max: string } {
  const now = new Date();
  const min = new Date(now);
  min.setDate(now.getDate() + 2);
  const max = new Date(now);
  max.setDate(now.getDate() + 30);
  return { min: toISODate(min), max: toISODate(max) };
}

/** true nếu chuỗi ngày (yyyy-MM-dd) rơi vào Chủ nhật. */
export function laChuNhat(isoDate: string): boolean {
  if (!isoDate) return false;
  return new Date(isoDate + "T00:00:00").getDay() === 0;
}
