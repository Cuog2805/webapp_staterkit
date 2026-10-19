# Kế hoạch: Chức năng Đăng nhập / Đăng ký cho starter-kit

## Context

Starter-kit gồm 3 phần độc lập, chưa có chức năng auth và chưa được nối với nhau:
- `db/` — MySQL 8.4 qua `docker-compose.yml`, thư mục `db/` được mount vào `/docker-entrypoint-initdb.d` (file `*.sql` đặt ở đây tự chạy khi init container lần đầu). DB tên `webapp`.
- `api/api/` — ASP.NET Core .NET 10, controller-based, **chưa có** EF Core, connection string, hay auth.
- `my-app/` — Next.js 16 (App Router, Tailwind v4), mới có trang mặc định.

Mục tiêu: triển khai luồng Đăng ký + Đăng nhập end-to-end với **JWT Bearer token**, truy cập DB bằng **EF Core + Pomelo MySQL**, và màn hình đăng nhập/đăng ký ở frontend.

Quyết định đã chốt với người dùng: JWT Bearer · Login + Register · EF Core + Pomelo.

---

## 1. Database (`db/`)

Tạo `db/01-init-users.sql` (prefix số để chạy đúng thứ tự trong initdb):

```sql
CREATE TABLE IF NOT EXISTS users (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  display_name  VARCHAR(100) NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

- Lưu `password_hash` (dùng BCrypt), không bao giờ lưu mật khẩu thô.
- Lưu ý: initdb chỉ chạy khi volume `mysql-data` còn trống. Nếu container đã init trước đó, cần chạy SQL thủ công hoặc `docker compose down -v` để tạo lại (sẽ xác nhận với người dùng trước khi xoá volume).

## 2. Backend API (`api/api/`)

**Packages cần thêm** (`api.csproj`):
- `Pomelo.EntityFrameworkCore.MySql`
- `Microsoft.EntityFrameworkCore.Design`
- `Microsoft.AspNetCore.Authentication.JwtBearer`
- `BCrypt.Net-Next` (hash mật khẩu)

**Cấu trúc file mới:**
- `Models/User.cs` — entity map vào bảng `users`.
- `Data/AppDbContext.cs` — `DbContext` với `DbSet<User>`, cấu hình tên cột snake_case + unique index trên `email`.
- `Dtos/AuthDtos.cs` — `RegisterRequest`, `LoginRequest`, `AuthResponse` (token + thông tin user).
- `Services/TokenService.cs` — sinh JWT (claims: sub = user id, email), ký bằng khoá đối xứng từ config.
- `Controllers/AuthController.cs` — route `[Route("auth")]`:
  - `POST /auth/register` — validate email/password, check trùng email, hash bằng BCrypt, lưu user, trả `AuthResponse`.
  - `POST /auth/login` — tìm theo email, verify BCrypt, trả JWT; sai → 401.
  - `GET /auth/me` — `[Authorize]`, trả thông tin user từ token (để frontend verify phiên).

**`Program.cs`** — thêm:
- `AddDbContext<AppDbContext>` dùng `UseMySql(connectionString, ServerVersion.AutoDetect(...))`.
- `AddAuthentication(JwtBearerDefaults...).AddJwtBearer(...)` với `TokenValidationParameters` khớp config.
- `app.UseAuthentication()` trước `app.UseAuthorization()` (hiện mới có UseAuthorization).
- `AddCors` policy cho phép origin `http://localhost:3000` (frontend) — cần cho JWT bearer từ browser; đặt `app.UseCors(...)` trước auth.

**Config** (`appsettings.json` + `appsettings.Development.json`):
```json
"ConnectionStrings": { "Default": "Server=localhost;Port=3306;Database=webapp;User=webapp;Password=change-me;" },
"Jwt": { "Issuer": "webapp-starterkit", "Audience": "webapp-starterkit", "Key": "<secret>", "ExpireMinutes": 60 }
```
- Secret JWT thật nên để ở Development/user-secrets, không commit. Connection string khớp `db/.env.example`.

## 3. Frontend (`my-app/`)

**Quan trọng:** Đây là Next.js 16 — trước khi code cần tham khảo `my-app/node_modules/next/dist/docs/` thay vì kiến thức Next.js cũ (theo CLAUDE.md / AGENTS.md). Giữ nguyên block `<!-- nextjs-agent-rules -->` do `next dev` sinh ra.

**File mới:**
- `lib/api.ts` — base URL API (`NEXT_PUBLIC_API_URL`, mặc định `http://localhost:5055`) + helper gọi `register`/`login`/`me`, đính kèm `Authorization: Bearer`.
- `lib/auth.ts` — lưu/đọc/xoá token (localStorage; đơn giản để khởi đầu — ghi chú rõ hạn chế XSS so với cookie).
- `app/login/page.tsx` — form email + password, gọi `login`, lưu token, điều hướng về `/`. Có link sang `/register`.
- `app/register/page.tsx` — form đăng ký (email, password, display name), gọi `register`, lưu token, điều hướng.
- `.env.local` (và `.env.example` nếu muốn) — `NEXT_PUBLIC_API_URL=http://localhost:5055`.
- Dùng client component (`"use client"`) cho form vì có state + sự kiện. Style bằng Tailwind v4 khớp `globals.css` (biến `--background`/`--foreground`, dark mode sẵn có).

Tùy chọn (nhỏ): cập nhật `app/page.tsx` hiển thị trạng thái đăng nhập + nút Logout để demo luồng chạy.

---

## Thứ tự thực hiện

1. DB: tạo file SQL.
2. Backend: thêm packages → Model/DbContext → DTO/TokenService → Controller → Program.cs + config → `dotnet build`.
3. Frontend: `lib/` helpers → trang login/register → env.

## Verification (chạy end-to-end)

1. **DB**: `cd db && docker compose up -d` (cần copy `.env.example` → `.env` nếu chưa có). Kiểm tra bảng: `docker exec -it webapp-mysql mysql -uwebapp -p webapp -e "SHOW TABLES;"`.
2. **API**: `cd api/api && dotnet run` (http://localhost:5055). Test bằng `api/api/api.http` hoặc curl:
   - `POST /auth/register` với email+password → kỳ vọng 200 + token.
   - `POST /auth/login` đúng mật khẩu → 200 + token; sai → 401.
   - `GET /auth/me` với `Authorization: Bearer <token>` → 200 thông tin user.
   - Kiểm tra OpenAPI tại `/openapi` (Development).
3. **Frontend**: `cd my-app && npm run dev` (http://localhost:3000). Vào `/register` tạo tài khoản → tự đăng nhập → về `/`; đăng xuất rồi vào `/login` đăng nhập lại. Xác nhận token được lưu và `/auth/me` trả đúng.
4. `npm run lint` và `dotnet build` sạch lỗi.

## Điều chỉnh thực tế khi triển khai (đã xác minh end-to-end)

- **Schema quản lý bằng Flyway** (migration SQL thuần trong `db/migrations/`, file `V1__create_users.sql`). Đã bỏ cơ chế `docker-entrypoint-initdb.d` ban đầu vì nó chỉ chạy một lần khi volume trống, không quản lý được thay đổi schema về sau. Service `flyway` thêm vào `db/docker-compose.yml`; xem `db/README.md`. (Lưu ý JDBC URL cần `allowPublicKeyRetrieval=true&useSSL=false` cho MySQL 8.4, và `command` phải ở dạng list để `&` không bị shell hiểu nhầm.)
- **Connection string khớp `db/.env` thật**, không phải `.env.example`: Database/User = `webapp_db`, Password = `webapp@123`. Đặt trong `appsettings.Development.json`; `appsettings.json` chỉ giữ placeholder.
- **Gỡ package `Microsoft.EntityFrameworkCore.Design`**: Pomelo mới có bản EF Core 9, Design 10 gây cảnh báo NU1608. Không cần Design vì dùng SQL init thay cho EF migrations.
- **Validation DTO dùng attribute gắn vào parameter** (`[Required]`, không phải `[property: Required]`): record positional param yêu cầu metadata trên tham số constructor, nếu không ASP.NET ném lỗi 500.
- Kết quả test: register 200, trùng email 409, password ngắn 400, login 200, sai mật khẩu 401, `/auth/me` có token 200 / không token 401.

## Ghi chú / rủi ro

- JWT lưu ở localStorage dễ bị XSS hơn HttpOnly cookie — chấp nhận được cho starter kit, có thể nâng cấp sau.
- Cần CORS đúng origin, nếu không browser sẽ chặn request từ `:3000` sang `:5055`.
- initdb không chạy lại nếu volume đã tồn tại — sẽ hỏi trước khi `docker compose down -v`.
- Không có test runner ở cả hai phía; verify thủ công qua `.http` và trình duyệt.
