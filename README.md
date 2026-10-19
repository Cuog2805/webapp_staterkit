# VNPT Ninh Bình Solutions

Cổng đăng ký giải pháp CNTT (chữ ký số, hóa đơn điện tử, camera AI, hạ tầng cloud, phần mềm quản lý).
Khách hàng tạo đơn → điều hành viên tiếp nhận & phân công → kỹ thuật viên triển khai.

Hệ thống gồm 3 phần chạy độc lập:

| Phần | Công nghệ | Thư mục | Cổng |
|------|-----------|---------|------|
| Cơ sở dữ liệu | MySQL 8.4 + Flyway (Docker) | `db/` | 3306 |
| Backend API | ASP.NET Core .NET 10 + EF Core (Pomelo MySQL) + JWT | `api/` | 5055 (http) |
| Frontend | Next.js 16 + React 19 + Tailwind v4 | `my-app/` | 3000 |

## Yêu cầu môi trường

- Docker (chạy MySQL + Flyway)
- .NET 10 SDK
- Node.js 20+ và npm

## Cài đặt & chạy (theo thứ tự)

### 1) Cơ sở dữ liệu

```bash
cd db
cp .env.example .env     # lần đầu; file .env đã có sẵn giá trị dev trong repo
docker compose up -d     # khởi động MySQL và tự áp dụng migration (Flyway)
```

Migration SQL nằm ở `db/migrations/` (V1 users, V2 tài khoản+danh mục, V3 đơn, V4 dữ liệu mẫu).
Chạy lại sạch từ đầu: `docker compose down -v && docker compose up -d`.

### 2) Backend API

```bash
cd api/api
dotnet run            # http://localhost:5055  (Swagger: /swagger)
```

Connection string và JWT nằm trong `api/api/appsettings.Development.json` (khớp `db/.env`).

### 3) Frontend

```bash
cd my-app
npm install
npm run dev           # http://localhost:3000
```

`my-app/.env.local` trỏ `NEXT_PUBLIC_API_URL=http://localhost:5055`.

## Tài khoản thử nghiệm

Đăng nhập bằng **số điện thoại**. Mật khẩu tất cả tài khoản mẫu: `password123`.

| Vai trò | Số điện thoại | Mật khẩu |
|---------|---------------|----------|
| Khách hàng (KHACH_HANG) | `0901000001` | `password123` |
| Điều hành (DIEU_HANH) | `0902000002` | `password123` |
| Kỹ thuật viên 1 (KY_THUAT) | `0903000003` | `password123` |
| Kỹ thuật viên 2 (KY_THUAT) | `0904000004` | `password123` |

Đăng ký mới (`/register`) luôn tạo tài khoản vai trò **Khách hàng**.

## Danh sách API (đặc tả đề)

| Method | Đường dẫn | Vai trò |
|--------|-----------|---------|
| POST | `/api/auth/register` | Công khai — `soDienThoai, matKhau, hoTen` |
| POST | `/api/auth/login` | Công khai — trả JWT |
| GET | `/api/auth/me` | Đã đăng nhập |
| GET | `/api/solutions` | Công khai — `page, size, nhom, q` |
| POST | `/api/orders` | KHACH_HANG — `dong[{giaiPhapId,soLuong}], diaChi, ngayHen` (+ header `Idempotency-Key`) |
| GET | `/api/orders` | Đã đăng nhập — khách: của mình; nhân viên: tất cả; `trangThai, page, size` |
| GET | `/api/orders/{id}` | Chủ đơn / nhân viên — chi tiết + lịch sử |
| POST | `/api/orders/{id}/transitions` | Theo bảng — `denTrangThai, ktvId, lyDo, version` |
| GET | `/api/reports/summary` | DIEU_HANH — `tuNgay, denNgay` |
| GET | `/api/users/ky-thuat` | DIEU_HANH — danh sách KTV để phân công (hỗ trợ UI) |

Lỗi trả `{ "error": { "code", "message" } }` với HTTP 400/401/403/404/409/422.
Danh sách phân trang bằng `page`, `size` (size tối đa 50).

## Quy tắc nghiệp vụ chính

- Đơn có 1–5 dòng, mỗi dòng số lượng 1–100. Đơn giá được **snapshot** vào đơn lúc đặt.
- Ưu đãi theo số **nhóm giải pháp khác nhau**: 2 nhóm giảm 5%, từ 3 nhóm giảm 10%.
- Ngày hẹn khảo sát: 2–30 ngày kể từ hôm nay, không vào Chủ nhật.
- Mã đơn: `DH-yyyyMMdd-nnnn`.
- Vòng đời đơn (sai bảng → 422, sai người → 403):
  `MOI → DA_TIEP_NHAN` (DIEU_HANH) · `MOI → HUY` (chủ đơn/DIEU_HANH, có lý do) ·
  `DA_TIEP_NHAN → DANG_TRIEN_KHAI` (DIEU_HANH, phân công ktvId) ·
  `DA_TIEP_NHAN → HUY` (DIEU_HANH, có lý do) · `DANG_TRIEN_KHAI → HOAN_TAT` (KY_THUAT được giao).

## Unit test (chạy bằng 1 lệnh)

```bash
cd api
dotnet test
```

Gồm: tính ưu đãi (1/2/3 nhóm, kèm ví dụ đề 4.700.000 → giảm 470.000) và chuyển trạng thái
hợp lệ / không hợp lệ (422) / sai vai trò (403) / thiếu lý do (422).

## Mẫu thiết kế (B3)

- **Strategy — chương trình ưu đãi**: `api/api/Services/Discounts/`
  (`IDiscountStrategy`, `KhongUuDai`/`UuDai2Nhom`/`UuDai3NhomTroLen`, `DiscountResolver`).
  Chọn chiến lược theo số nhóm giải pháp khác nhau.
- **State — vòng đời đơn**: `api/api/Services/Workflow/OrderStateMachine.cs`
  (bảng chuyển trạng thái tập trung, không rải if/else). `OrderTransitionService` áp dụng bảng này.

## Nâng cao (B4)

- **Chống tạo trùng đơn**: header `Idempotency-Key` khi `POST /api/orders` — cùng key trả lại đơn đã tạo.
- **Khóa lạc quan**: trường `version` trên đơn; `POST .../transitions` phải gửi `version` hiện tại,
  hai người cùng chuyển trạng thái thì người sau nhận `409`.

## Ghi chú kỹ thuật

- Database-first: Flyway là nguồn chân lý của schema; entity EF Core chỉ map vào bảng đã có.
- JWT lưu ở `localStorage` phía client (đơn giản cho starter kit; rủi ro XSS cao hơn cookie HttpOnly).
- Không sửa migration đã áp dụng — thêm migration mới (V5, …) cho thay đổi schema về sau.
