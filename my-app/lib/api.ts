// Client gọi API backend (ASP.NET) cho cổng VNPT Ninh Bình Solutions.
import { getToken } from "./auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5055";

// ---- Kiểu dữ liệu ----
export type VaiTro = "KHACH_HANG" | "DIEU_HANH" | "KY_THUAT";

export interface UserDto {
  id: number;
  soDienThoai: string | null;
  hoTen: string | null;
  vaiTro: VaiTro;
}

export interface AuthResponse {
  token: string;
  user: UserDto;
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
}

export interface SolutionDto {
  id: number;
  ma: string;
  ten: string;
  nhom: string;
  donGia: number;
}

export interface OrderListItem {
  id: number;
  maDon: string;
  trangThai: string;
  diaChi: string;
  ngayHen: string;
  tongTien: number;
  giamGia: number;
  thanhToan: number;
  khachHangId: number;
  ktvId: number | null;
  version: number;
  ngayTao: string;
}

export interface OrderItemDto {
  giaiPhapId: number;
  ten: string;
  nhom: string;
  donGia: number;
  soLuong: number;
  thanhTien: number;
}

export interface OrderHistoryDto {
  tuTrangThai: string | null;
  denTrangThai: string;
  nguoiThucHienId: number | null;
  lyDo: string | null;
  thoiGian: string;
}

export interface OrderDetail {
  id: number;
  maDon: string;
  trangThai: string;
  diaChi: string;
  ngayHen: string;
  tongTien: number;
  giamGia: number;
  thanhToan: number;
  khachHangId: number;
  khachHangTen: string | null;
  ktvId: number | null;
  ktvTen: string | null;
  version: number;
  ngayTao: string;
  dong: OrderItemDto[];
  lichSu: OrderHistoryDto[];
}

export interface ReportSummary {
  soDonTheoTrangThai: { trangThai: string; soLuong: number }[];
  doanhThuTheoNhom: { nhom: string; doanhThu: number }[];
  tyLeHuy: number;
  tongSoDon: number;
}

export interface OrderLineInput {
  giaiPhapId: number;
  soLuong: number;
}

/** Lỗi API kèm mã nghiệp vụ (code) và HTTP status. */
export class ApiError extends Error {
  constructor(message: string, public code: string, public status: number) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });

  if (!res.ok) {
    let message = `Yêu cầu thất bại (${res.status})`;
    let code = "ERROR";
    try {
      const body = await res.json();
      if (body?.error?.message) {
        message = body.error.message;
        code = body.error.code ?? code;
      }
    } catch {
      // response không phải JSON — giữ message mặc định
    }
    throw new ApiError(message, code, res.status);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

function qs(params: Record<string, string | number | undefined | null>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

// ---- Auth ----
export function register(input: { soDienThoai: string; matKhau: string; hoTen: string }): Promise<AuthResponse> {
  return request<AuthResponse>("/api/auth/register", { method: "POST", body: JSON.stringify(input) });
}

export function login(input: { soDienThoai: string; matKhau: string }): Promise<AuthResponse> {
  return request<AuthResponse>("/api/auth/login", { method: "POST", body: JSON.stringify(input) });
}

export function me(): Promise<UserDto> {
  return request<UserDto>("/api/auth/me");
}

// ---- Solutions ----
export function getSolutions(params: { page?: number; size?: number; nhom?: string; q?: string }): Promise<Paged<SolutionDto>> {
  return request<Paged<SolutionDto>>(`/api/solutions${qs(params)}`);
}

// ---- Orders ----
export function createOrder(
  input: { dong: OrderLineInput[]; diaChi: string; ngayHen: string },
  idempotencyKey: string,
): Promise<OrderDetail> {
  return request<OrderDetail>("/api/orders", {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey },
    body: JSON.stringify(input),
  });
}

export function getOrders(params: { trangThai?: string; page?: number; size?: number }): Promise<Paged<OrderListItem>> {
  return request<Paged<OrderListItem>>(`/api/orders${qs(params)}`);
}

export function getOrder(id: number | string): Promise<OrderDetail> {
  return request<OrderDetail>(`/api/orders/${id}`);
}

export function transitionOrder(
  id: number | string,
  input: { denTrangThai: string; ktvId?: number | null; lyDo?: string | null; version: number },
): Promise<OrderDetail> {
  return request<OrderDetail>(`/api/orders/${id}/transitions`, { method: "POST", body: JSON.stringify(input) });
}

// ---- Users ----
export function getTechnicians(): Promise<UserDto[]> {
  return request<UserDto[]>("/api/users/ky-thuat");
}

// ---- Reports ----
export function getReportSummary(params: { tuNgay?: string; denNgay?: string }): Promise<ReportSummary> {
  return request<ReportSummary>(`/api/reports/summary${qs(params)}`);
}
