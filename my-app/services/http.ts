// HTTP client dùng chung cho tầng services.
// Mọi service gọi backend (ASP.NET) đều đi qua đây để thống nhất:
// - base URL, credentials (cookie HttpOnly chứa JWT), header JSON
// - xử lý lỗi (ApiError) và 204 No Content
//
// Tầng services bọc các lời gọi API lại thành hàm có kiểu rõ ràng,
// để page/component chỉ import hàm nghiệp vụ, không tự fetch.

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5055";

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.message) message = body.message;
    } catch {
      // response không phải JSON — giữ message mặc định
    }
    throw new ApiError(message, res.status);
  }

  // 204 No Content (vd: logout) — không có body để parse.
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
