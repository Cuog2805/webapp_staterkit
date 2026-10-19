# Playbook: Xử lý đề thi khác cùng format

Tài liệu này hướng dẫn cách **tái sử dụng** kiến trúc của dự án hiện tại (xem
`docs/vnpt-solutions-plan.md`) để giải một đề thi "Lập trình ứng dụng" **khác nhưng cùng khuôn mẫu**:
một nghiệp vụ có **danh mục → đơn/hồ sơ → vòng đời trạng thái theo vai trò**, JWT, phân trang,
lỗi chuẩn, cộng phần nâng cao (báo cáo, unit test, design pattern, idempotency/optimistic lock).

> Cách dùng: điền phần **"Bản đồ đề"** bên dưới từ đề mới, rồi theo **checklist thực hiện**.
> Mỗi mục trỏ tới đúng file mẫu trong repo để sao chép & chỉnh.

---

## 1. Nhận diện khuôn mẫu đề

Đề cùng format thường có các khối giống nhau (khác tên miền nghiệp vụ):

| Khối đề | Ở đề VNPT là… | Tổng quát |
|---------|----------------|-----------|
| Bối cảnh + **danh mục** có phân **nhóm** | Giải pháp CNTT (5 nhóm) | Danh mục sản phẩm/dịch vụ có phân loại |
| **Vai trò** | KHACH_HANG / DIEU_HANH / KY_THUAT | 3–4 vai trò với quyền khác nhau |
| **Đơn/hồ sơ** có nhiều dòng | Đơn đăng ký (1–5 dòng) | Đơn/hồ sơ/phiếu có chi tiết |
| **Quy tắc tính tiền/ưu đãi** | Ưu đãi theo số nhóm | Chiết khấu/phụ phí/điểm theo điều kiện |
| **Vòng đời trạng thái** + bảng chuyển | 5 trạng thái | State machine theo vai trò + điều kiện |
| **Mã định danh** theo định dạng | `DH-yyyyMMdd-nnnn` | Mã có tiền tố + ngày + số thứ tự |
| **Danh sách API** cố định tên trường | mục IV | Giữ **đúng path & tên trường** |
| Thang điểm **A (cơ bản)** + **B (nâng cao)** | 7đ + 3đ | Giống hệt |

Nếu đề mới khớp bảng trên → toàn bộ kiến trúc repo này tái dùng gần như nguyên vẹn.

---

## 2. Bản đồ đề (điền từ đề mới)

- **Tên nghiệp vụ / cổng:** …
- **Danh mục & các nhóm:** … (liệt kê mã nhóm dạng SNAKE_CASE)
- **Vai trò:** … (SNAKE_CASE) + quyền tóm tắt từng vai trò
- **Thực thể đơn/hồ sơ:** trường gì? có bao nhiêu dòng? ràng buộc số lượng?
- **Quy tắc tính tiền/ưu đãi:** điều kiện → mức (dùng cho **Strategy** + unit test)
- **Vòng đời trạng thái:** bảng `(từ → đến) | ai thực hiện | điều kiện` (dùng cho **State machine**)
- **Định dạng mã:** tiền tố + thành phần ngày + số thứ tự
- **Danh sách API:** copy nguyên path + tên trường JSON (tiếng Việt nếu đề yêu cầu)
- **Báo cáo (B1):** các chỉ số cần (đếm theo trạng thái, doanh thu theo nhóm, tỷ lệ…)
- **Quy tắc riêng:** idempotency? version? ngày hợp lệ? v.v.

---

## 3. Checklist thực hiện (map sang file mẫu)

### A1 — CSDL (database-first, Flyway) → `db/migrations/`
- Thêm migration **mới** `V<n>__...sql` (KHÔNG sửa migration đã áp dụng).
- Bảng tối thiểu: `users` (+ `vai_tro`, định danh đăng nhập), danh mục (+ `nhom`, `don_gia`),
  đơn (`ma_*` unique, FK người tạo/người xử lý, `trang_thai`, tiền, `version`, `idempotency_key`),
  chi tiết đơn (snapshot `don_gia`/`nhom`), lịch sử trạng thái.
- Seed đủ: danh mục phủ mọi nhóm; mỗi vai trò ≥1 tài khoản (mật khẩu **băm BCrypt** sẵn — sinh bằng
  `python -c "import bcrypt;print(bcrypt.hashpw(b'password123',bcrypt.gensalt(11)).decode())"`);
  nhiều đơn ở mọi trạng thái. Mẫu: `db/migrations/V2..V4`.
- Chạy sạch: `cd db && docker compose down -v && docker compose up -d`.

### A2 — Auth JWT + phân quyền → `api/api/`
- Entity + `DbSet` theo `Models/User.cs` (data annotations, snake_case `[Column]`). DTO record
  positional, `[Required]` trên **tham số** (`Dtos/AuthDtos.cs`).
- JWT thêm claim role: `Services/TokenService.cs` (`ClaimTypes.Role`).
- Lỗi chuẩn `{error:{code,message}}`: `Infrastructure/ApiException.cs`,
  `ExceptionHandlingMiddleware.cs`, và `InvalidModelStateResponseFactory` trong `Program.cs`
  (401/403 qua `JwtBearerEvents`).
- Quy ước mã lỗi: thiếu token→401, sai vai trò→403, xem dữ liệu người khác→404.

### A3 — Danh mục + tạo đơn → `Controllers/SolutionsController.cs`, `Services/OrderService.cs`
- Danh mục: phân trang `page/size` (clamp **size ≤ 50**), lọc theo `nhom`, tìm theo tên/mã.
- Tạo đơn: validate dòng/số lượng/ngày; **snapshot đơn giá**; tính ưu đãi qua **Strategy**;
  sinh mã theo định dạng; xử lý `Idempotency-Key`.

### A4 — Chuyển trạng thái → `Services/Workflow/OrderStateMachine.cs` + `OrderTransitionService.cs`
- Khai báo **bảng chuyển trạng thái tập trung** (từ đề). Service chỉ phân giải dữ kiện
  (chủ sở hữu, người được giao, tham chiếu hợp lệ) rồi gọi state machine. Ghi lịch sử. Kiểm `version`.

### A5 — Giao diện → `my-app/app/*`
- Đăng nhập/đăng ký (`login`, `register`), danh mục + tạo đơn có **tạm tính** (`solutions`),
  danh sách có phân trang + chọn số dòng/trang (`orders` + `components/PageSizeSelect.tsx`),
  chi tiết + nút chuyển trạng thái theo vai trò (`orders/[id]`), báo cáo (`reports`).
- Client API + parse lỗi: `lib/api.ts`; phiên phản ứng login/logout: `lib/useSession.ts` +
  sự kiện trong `lib/auth.ts`; nhãn/định dạng: `lib/labels.ts`; dropdown: class `.ui-select`
  trong `app/globals.css`.
- **Next.js 16**: route động client đọc `params` qua server wrapper (`await params`) + `<Suspense>`;
  tránh `crypto.randomUUID()` lúc render; không setState đồng bộ trong `useEffect`.

### A6 — README → `README.md` (cài/chạy 3 phần, **tài khoản thử**, lệnh test, vị trí pattern).

### B1 — Báo cáo → `Services/ReportService.cs` + `Controllers/ReportsController.cs` + `app/reports`.
### B2 — Unit test → `api/api.Tests/` (xUnit), chạy `cd api && dotnet test` (ưu đãi + transitions).
### B3 — Nêu tên & vị trí **State** và **Strategy** trong README.
### B4 — `Idempotency-Key` (header) + `version` (optimistic lock → 409).

---

## 4. Những chỗ phải đổi khi sang đề mới (checklist nhanh)

1. Hằng enum: `Models/Enums.cs` (vai trò, nhóm, trạng thái).
2. Bảng chuyển trạng thái: `OrderStateMachine.Rules`.
3. Quy tắc ưu đãi/tính tiền: `Services/Discounts/*` (+ test tương ứng).
4. Định dạng mã: `OrderService.GenerateMaDonAsync`.
5. Tên path/field API: controllers + `Dtos/*` + `lib/api.ts` (giữ **đúng đặc tả**).
6. Danh mục/seed: migration `db/migrations/`.
7. Nhãn tiếng Việt: `my-app/lib/labels.ts`.

## 5. Lệnh verify end-to-end

```bash
# DB
cd db && docker compose down -v && docker compose up -d
# API
cd ../api/api && dotnet run              # http://localhost:5055  (Swagger /swagger)
# Test
cd ../ && dotnet test
# Frontend
cd ../my-app && npm run lint && npm run build && npm run dev
```

Kịch bản kiểm thử: register/login mỗi vai trò → tạo đơn (ưu đãi + mã đúng, gửi lại cùng
Idempotency-Key không tạo trùng) → phân quyền 401/403/404 → chuyển trạng thái đúng/sai bảng
(422)/sai người (403)/version cũ (409) → báo cáo.
