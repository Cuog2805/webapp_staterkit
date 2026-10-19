# Kế hoạch: Cổng "VNPT Ninh Bình Solutions" (Đề thi Mã đề 01)

## Context

Đề thi (`docs/documents/De_thi_Lap_trinh_ung_dung_Ma_de_01.docx`) yêu cầu xây dựng cổng
đăng ký giải pháp CNTT: khách hàng tạo đơn chọn giải pháp → điều hành tiếp nhận & phân công
kỹ thuật viên → kỹ thuật viên triển khai. 3 vai trò: `KHACH_HANG`, `DIEU_HANH`, `KY_THUAT`.

Basecode hiện là starter kit với **auth email/JWT đã chạy end-to-end** (xem `docs/auth-login-plan.md`):
Next.js 16 (`my-app`), ASP.NET Core .NET 10 + EF Core/Pomelo (`api`), MySQL 8.4 + Flyway (`db`).
Chỉ có bảng `users` và 3 endpoint `/auth/*`. Cần mở rộng thành hệ thống quản lý đơn đầy đủ.

**Mục tiêu:** đạt trọn Phần A (7đ) + Phần B (3đ).

**Quyết định đã chốt:**
- Phạm vi: **toàn bộ A + B**.
- Auth: **giữ cột `email` (nullable)**, thêm `so_dien_thoai` làm định danh đăng nhập đúng đặc tả
  (`soDienThoai`/`matKhau`/`hoTen`). Đăng ký mới luôn tạo vai trò `KHACH_HANG`.
- Seed: qua **migration Flyway** (mật khẩu băm BCrypt sẵn trong SQL).

**Ràng buộc đặc tả bắt buộc giữ đúng:**
- Đường dẫn & tên trường JSON phải khớp mục IV (tiếng Việt: `soLuong`, `giaiPhapId`, `diaChi`,
  `ngayHen`, `denTrangThai`, `ktvId`, `lyDo`, `version`, `trangThai`, `nhom`, `q`, `page`, `size`,
  `tuNgay`, `denNgay`).
- Lỗi trả `{ "error": { "code", "message" } }` với HTTP 400/401/403/404/409/422.
- Phân trang `page`,`size` (size tối đa 50). JWT + mật khẩu băm + phân quyền theo vai trò.

---

## 1. Database (`db/migrations/`) — database-first, migration mới (không sửa V1)

Các enum lưu dạng chuỗi (VARCHAR) — khớp Strategy/State ở backend.

- **`V2__accounts_and_catalog.sql`**
  - `ALTER TABLE users`: thêm `so_dien_thoai VARCHAR(20) NULL UNIQUE`, `ho_ten VARCHAR(100) NULL`,
    `vai_tro VARCHAR(20) NOT NULL DEFAULT 'KHACH_HANG'`; đổi `email` sang `NULL` (đăng ký không có email).
  - `solutions` (giải pháp): `id`, `ma VARCHAR(50) UNIQUE`, `ten VARCHAR(255)`,
    `nhom VARCHAR(30)` (CHU_KY_SO/HOA_DON_DT/CAMERA_AI/CLOUD/PHAN_MEM), `don_gia DECIMAL(18,2)`,
    `created_at`. Index trên `nhom`.
- **`V3__orders.sql`**
  - `orders` (đơn): `id`, `ma_don VARCHAR(20) UNIQUE` (DH-yyyyMMdd-nnnn), `khach_hang_id` FK→users,
    `ktv_id` FK→users NULL (kỹ thuật viên được giao), `dia_chi VARCHAR(255)`, `ngay_hen DATE`,
    `trang_thai VARCHAR(20)` (MOI/DA_TIEP_NHAN/DANG_TRIEN_KHAI/HOAN_TAT/HUY),
    `tong_tien`, `giam_gia`, `thanh_toan` DECIMAL(18,2), `version INT NOT NULL DEFAULT 0`,
    `idempotency_key VARCHAR(100) NULL UNIQUE`, `created_at`, `updated_at`.
  - `order_items` (chi tiết đơn): `id`, `don_id` FK, `giai_phap_id` FK, `nhom` (snapshot),
    `don_gia DECIMAL(18,2)` (snapshot đơn giá lúc đặt), `so_luong INT` (1–100), `thanh_tien DECIMAL(18,2)`.
  - `order_status_history` (lịch sử trạng thái): `id`, `don_id` FK, `tu_trang_thai`, `den_trang_thai`,
    `nguoi_thuc_hien_id` FK→users, `ly_do VARCHAR(255) NULL`, `created_at`.
  - Khóa ngoại + index phù hợp (A1).
- **`V4__seed.sql`** (dữ liệu mẫu A1):
  - ≥8 giải pháp phủ đủ 5 nhóm, đơn giá thực tế.
  - 4 tài khoản (mật khẩu băm BCrypt **sẵn trong SQL** — sinh bằng `dotnet`/script lúc viết):
    1 `KHACH_HANG`, 1 `DIEU_HANH`, 2 `KY_THUAT`.
  - ≥6 đơn ở nhiều trạng thái (MOI, DA_TIEP_NHAN, DANG_TRIEN_KHAI, HOAN_TAT, HUY) kèm chi tiết +
    lịch sử; tính sẵn ưu đãi/mã đơn trong SQL.

> Chạy lại sạch: `cd db && docker compose down -v && docker compose up -d`.

## 2. Backend (`api/api/`)

**Dọn dẹp:** xóa `WeatherForecast.cs` + `Controllers/WeatherForecastController.cs`.

### Enums (`Models/Enums.cs`)
`VaiTro` (KHACH_HANG/DIEU_HANH/KY_THUAT), `NhomGiaiPhap` (5 nhóm), `TrangThaiDon` (5 trạng thái).

### Entities (data annotations, theo pattern `Models/User.cs` trong CLAUDE.md)
- Mở rộng `User`: `SoDienThoai`, `HoTen`, `VaiTro` (+ `[Index(SoDienThoai, IsUnique)]`).
- `Solution`, `Order`, `OrderItem`, `OrderStatusHistory` — mỗi property có `[Column("snake_case")]`,
  `[Table]`, `[Index]` class-level. `Order.Version` dùng `[ConcurrencyCheck]` cho optimistic lock.
- Thêm `DbSet<>` tương ứng vào `Data/AppDbContext.cs` (không `OnModelCreating`).

### Design patterns (B3 — nêu tên + vị trí trong README)
- **Strategy — ưu đãi** `Services/Discounts/`:
  `IDiscountStrategy` + `KhongUuDai`/`UuDai5`/`UuDai10` + `DiscountResolver` chọn theo **số nhóm
  khác nhau** (1→0%, 2→5%, ≥3→10%). Dùng cho tạo đơn **và** unit test B2.
- **State — vòng đời đơn** `Services/Workflow/OrderStateMachine.cs`:
  một **bảng chuyển trạng thái tập trung** (dictionary) khai báo mỗi cạnh: `(từ→đến)` → vai trò
  được phép + điều kiện (lyDo bắt buộc / ktvId hợp lệ) + ownership. Không rải if/else.
  Chuyển không có trong bảng → 422; sai người → 403.

### Services
- `TokenService`: **thêm claim `role`** (`ClaimTypes.Role` = `vai_tro`) để `[Authorize(Roles=...)]` chạy.
- `OrderService`: validate (1–5 dòng, soLuong 1–100, ngayHen 2–30 ngày & không Chủ nhật),
  snapshot đơn giá, tính ưu đãi qua Strategy, **sinh mã đơn** `DH-yyyyMMdd-nnnn` (số thứ tự theo ngày),
  xử lý `Idempotency-Key` (trùng key → trả lại đơn cũ, không tạo mới — B4).
- `OrderTransitionService`: áp `OrderStateMachine`, kiểm `version` (lệch → 409 — B4), ghi lịch sử.
- `ReportService` (B1): số đơn theo trạng thái; doanh thu dự kiến theo nhóm (loại đơn HUY);
  tỷ lệ hủy (%).

### DTOs (`Dtos/`) — tên trường khớp đặc tả, record positional, `[Required]` trên tham số
- `AuthDtos`: `RegisterRequest(soDienThoai, matKhau, hoTen)`, `LoginRequest(soDienThoai, matKhau)`,
  `AuthResponse(token, user{ id, soDienThoai, hoTen, vaiTro })`.
- `SolutionDtos`, `OrderDtos` (`CreateOrderRequest{ dong:[{giaiPhapId,soLuong}], diaChi, ngayHen }`,
  `OrderListItem`, `OrderDetail` + lịch sử, `TransitionRequest{ denTrangThai, ktvId, lyDo, version }`),
  `ReportDtos`, `PagedResult<T>{ items, total, page, size }`.

### Infrastructure — chuẩn hóa lỗi & phân quyền
- `Infrastructure/ApiException.cs` (mang HTTP status + code) + `ExceptionHandlingMiddleware` →
  body `{ error: { code, message } }`.
- Cấu hình `ApiBehaviorOptions.InvalidModelStateResponseFactory` để lỗi validation 400 cũng ra
  đúng shape `{ error: { code, message } }`.
- Dùng `[Authorize(Roles="...")]` cho phân quyền; khách xem đơn người khác → **404** (không lộ tồn tại).

### Controllers (đổi prefix sang `/api`)
- `AuthController` → `[Route("api/auth")]`: `register` (tạo KHACH_HANG, băm BCrypt, trùng SĐT→409),
  `login` (theo soDienThoai), `me`.
- `SolutionsController` `GET /api/solutions` — công khai, `page/size/nhom/q`.
- `OrdersController`:
  `POST /api/orders` [KHACH_HANG] (nhận header `Idempotency-Key`);
  `GET /api/orders` [đã đăng nhập] (khách: của mình; nhân viên: tất cả; `trangThai/page/size`);
  `GET /api/orders/{id}` (chủ đơn/nhân viên, kèm lịch sử; sai quyền→404);
  `POST /api/orders/{id}/transitions`.
- `ReportsController` `GET /api/reports/summary` [DIEU_HANH] — `tuNgay/denNgay`.

## 3. Unit tests (B2) — `api/api.Tests/` (xUnit), chạy bằng `dotnet test`

- Ưu đãi: 1 nhóm (0%), 2 nhóm (5%), 3 nhóm (10%) — dùng ví dụ đề: 4.700.000 → 4.230.000.
- Chuyển trạng thái: 1 ca hợp lệ (MOI→DA_TIEP_NHAN bởi DIEU_HANH) + 1 ca không hợp lệ
  (MOI→HOAN_TAT → 422, hoặc sai vai trò → 403).
- Thêm project vào `api.slnx`.

## 4. Frontend (`my-app/`)

> Next.js 16 — tham khảo `my-app/node_modules/next/dist/docs/01-app/` trước khi code; giữ nguyên
> block `<!-- nextjs-agent-rules -->` trong `AGENTS.md`. Style Tailwind v4 khớp `globals.css`.

- `lib/api.ts`: đổi auth sang `soDienThoai`; thêm `solutions()`, `createOrder()` (gửi header
  `Idempotency-Key`), `orders()`, `orderDetail()`, `transition()`, `reportSummary()`;
  parse lỗi theo shape `{ error: { code, message } }`.
- `lib/auth.ts`: lưu thêm `vaiTro`/user (từ response login) để UI render nút theo vai trò.
- Cập nhật `app/login`, `app/register` (trường SĐT/mật khẩu/họ tên).
- Trang mới:
  - `app/solutions/page.tsx` — catalog: phân trang, lọc `nhom`, tìm `q`; chọn giải pháp + số lượng,
    nhập `diaChi`/`ngayHen`, **hiển thị tạm tính (ưu đãi)**, tạo đơn.
  - `app/orders/page.tsx` — danh sách đơn (phân trang, lọc `trangThai`).
  - `app/orders/[id]/page.tsx` — chi tiết + lịch sử + **nút chuyển trạng thái đúng vai trò**,
    hiển thị lỗi (409/422/403).
  - `app/reports/page.tsx` — [DIEU_HANH] số đơn theo trạng thái, doanh thu theo nhóm, tỷ lệ hủy (B1).
- Cập nhật `app/page.tsx`/nav điều hướng tới các trang theo vai trò.

## 5. README (A6, B3)

Cập nhật README gốc (và/hoặc README từng phần): cách cài & chạy db/api/frontend, **tài khoản thử
nghiệm** (SĐT + mật khẩu của 4 user seed), lệnh chạy unit test, và **nêu tên + vị trí** của mẫu
State (`Services/Workflow/OrderStateMachine.cs`) và Strategy (`Services/Discounts/`).

---

## Thứ tự thực hiện

1. DB: viết V2/V3/V4 (sinh hash BCrypt cho seed) → `docker compose down -v && up -d` kiểm tra bảng.
2. Backend: enums → entities + DbSet → Strategy + StateMachine → Services → DTOs → Infrastructure
   (lỗi/phân quyền) → Controllers (+ role claim) → xóa WeatherForecast → `dotnet build`.
3. Tests: project `api.Tests` → `dotnet test`.
4. Frontend: `lib/` → login/register → solutions → orders/list + detail → reports → nav.
5. README.

## Verification (end-to-end)

1. **DB:** `cd db && docker compose down -v && docker compose up -d`;
   `docker exec -it webapp-mysql mysql -uwebapp_db -pwebapp@123 webapp_db -e "SHOW TABLES; SELECT vai_tro,count(*) FROM users GROUP BY vai_tro; SELECT trang_thai,count(*) FROM orders GROUP BY trang_thai;"`
   → đủ bảng, 4 user đúng vai trò, ≥6 đơn nhiều trạng thái.
2. **API** (`cd api/api && dotnet run`, http://localhost:5055) — test qua `api.http`/curl:
   - `POST /api/auth/register` KHACH_HANG mới; trùng SĐT→409; thiếu trường→400.
   - `POST /api/auth/login` các vai trò seed → JWT có claim role.
   - `GET /api/solutions?page=1&size=5&nhom=CLOUD&q=...` → phân trang/lọc/tìm.
   - `POST /api/orders` (KHACH_HANG): ưu đãi đúng ví dụ đề (4.230.000), mã `DH-...`; gửi lại cùng
     `Idempotency-Key` → trả đúng đơn cũ (không tạo mới).
   - Phân quyền: không token→401; khách gọi `/api/reports/summary`→403; khách GET đơn người khác→404.
   - `POST /api/orders/{id}/transitions`: đúng bảng (MOI→DA_TIEP_NHAN bởi DIEU_HANH), sai bảng→422,
     sai người→403; gửi `version` cũ sau khi đã đổi → 409.
   - `GET /api/reports/summary?tuNgay=...&denNgay=...` [DIEU_HANH].
3. **Tests:** `cd api/api.Tests && dotnet test` → xanh (≥3 ca).
4. **Frontend** (`cd my-app && npm run dev`): đăng nhập từng vai trò; tạo đơn (thấy tạm tính);
   danh sách phân trang; chi tiết + nút chuyển trạng thái đúng vai trò + thông báo lỗi; trang báo cáo
   (DIEU_HANH). `npm run lint` & `dotnet build` sạch.

## Ghi chú / rủi ro

- Mã đơn theo ngày có thể đua (race) khi tạo đồng thời — chấp nhận cho starter/đề thi; `ma_don` UNIQUE
  bắt lỗi trùng.
- JWT vẫn lưu localStorage (như basecode) — rủi ro XSS, chấp nhận được.
- Flyway: không sửa V1 đã áp dụng; mọi thay đổi qua V2+.
