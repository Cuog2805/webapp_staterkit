# Database (`db/`)

MySQL 8.4 chạy bằng Docker Compose, schema được quản lý bằng **Flyway** (migration SQL thuần).

## Mục lục

- [Thành phần](#thành-phần)
- [Yêu cầu](#yêu-cầu)
- [Thiết lập lần đầu](#thiết-lập-lần-đầu)
- [Luồng làm việc hàng ngày](#luồng-làm-việc-hàng-ngày)
- [Quản lý schema bằng Flyway](#quản-lý-schema-bằng-flyway)
  - [Quy ước đặt tên](#quy-ước-đặt-tên)
  - [Thêm một migration mới (chi tiết)](#thêm-một-migration-mới-chi-tiết)
  - [Seed dữ liệu](#seed-dữ-liệu)
  - [Lệnh Flyway hữu ích](#lệnh-flyway-hữu-ích)
- [Kết nối tới database](#kết-nối-tới-database)
- [Làm lại database từ đầu](#làm-lại-database-từ-đầu)
- [Xử lý sự cố](#xử-lý-sự-cố)
- [Quan hệ với backend (.NET)](#quan-hệ-với-backend-net)

## Thành phần

| File / thư mục | Vai trò |
|---|---|
| `docker-compose.yml` | Định nghĩa service `mysql` và `flyway` |
| `.env` | Biến môi trường thật (không commit) — copy từ `.env.example` |
| `.env.example` | Mẫu biến môi trường |
| `migrations/` | Các file migration SQL do Flyway chạy (dev + production) |
| `seed/` | Dữ liệu mẫu, chỉ chạy ở dev |

Các biến trong `.env`:

| Biến | Ý nghĩa |
|---|---|
| `MYSQL_ROOT_PASSWORD` | Mật khẩu user `root` |
| `MYSQL_DATABASE` | Tên database được tạo sẵn (vd `webapp_db`) |
| `MYSQL_USER` / `MYSQL_PASSWORD` | User thường mà app + Flyway dùng |
| `MYSQL_PORT` | Cổng publish ra host (mặc định `3306`) |

## Yêu cầu

- Docker + Docker Compose (v2, dùng `docker compose` không dấu gạch nối).
- Cổng `3306` (hoặc giá trị `MYSQL_PORT`) còn trống trên máy.

## Thiết lập lần đầu

```bash
cd db
cp .env.example .env     # rồi sửa giá trị trong .env cho phù hợp
docker compose up -d     # khởi động MySQL + chạy migration qua Flyway
```

- `mysql` giữ dữ liệu trong volume `mysql-data` (bền qua các lần restart).
- `flyway` chạy một lần khi `up`, áp dụng mọi migration còn thiếu rồi **thoát** (đây là hành vi bình thường — container ở trạng thái `Exited (0)`, không phải lỗi).

Xác nhận đã chạy thành công:

```bash
docker logs webapp-flyway        # thấy "Successfully applied N migration"
docker compose ps                # mysql: running/healthy, flyway: exited (0)
```

## Luồng làm việc hàng ngày

```bash
cd db
docker compose up -d          # bật DB (và áp dụng migration còn thiếu nếu có)
docker compose stop           # tắt tạm (giữ nguyên dữ liệu)
docker compose start          # bật lại
docker compose logs -f mysql  # xem log MySQL
docker compose down           # tắt & xóa container (GIỮ dữ liệu trong volume)
```

> `down` (không có `-v`) chỉ xóa container, **không** xóa dữ liệu. Chỉ `down -v` mới xóa volume/dữ liệu.

## Quản lý schema bằng Flyway

Mọi thay đổi schema (tạo/sửa bảng, index, seed data…) được viết bằng **SQL thuần** trong `migrations/`. Flyway theo dõi migration nào đã chạy trong bảng `flyway_schema_history`, nên mỗi migration versioned chỉ chạy đúng một lần — kể cả khi bạn chạy `up` nhiều lần.

### Quy ước đặt tên

| Loại | Mẫu tên | Hành vi |
|---|---|---|
| Versioned | `V<số>__<mô_tả>.sql` | Chạy đúng 1 lần, theo thứ tự version tăng dần |
| Repeatable | `R__<mô_tả>.sql` | Chạy lại mỗi khi nội dung file thay đổi (hợp cho VIEW, stored procedure) |

Ví dụ: `V1__create_users.sql`, `V2__add_phone_to_users.sql`, `R__user_summary_view.sql`.

Quy tắc quan trọng:

- Dùng **hai** dấu gạch dưới (`__`) ngăn giữa version và mô tả.
- Version phải **tăng dần** và không trùng (`V1`, `V2`, `V3`… hoặc `V1.1`, `V1.2`).
- **Không sửa nội dung một migration versioned đã chạy** — Flyway lưu checksum và sẽ báo lỗi `validate`. Muốn thay đổi → tạo migration mới.
- Mỗi file nên là một thay đổi logic, đặt tên mô tả rõ (`V3__add_index_users_email.sql`).

### Thêm một migration mới (chi tiết)

Ví dụ: thêm cột `phone` vào bảng `users`.

1. **Tạo file** `migrations/V2__add_phone_to_users.sql`:

   ```sql
   ALTER TABLE users ADD COLUMN phone VARCHAR(20) NULL AFTER display_name;
   ```

2. **Áp dụng** (DB đang chạy):

   ```bash
   docker compose run --rm flyway migrate
   ```

   Log kỳ vọng:
   ```
   Migrating schema `webapp_db` to version "2 - add phone to users"
   Successfully applied 1 migration ... now at version v2
   ```

3. **Kiểm chứng** cột đã có:

   ```bash
   docker exec webapp-mysql \
     mysql -uwebapp_db -pwebapp@123 webapp_db -e "DESCRIBE users;"
   ```

4. **Cập nhật phía .NET** nếu app cần đọc cột mới: thêm property vào `api/api/Models/User.cs` và mapping trong `api/api/Data/AppDbContext.cs` (xem mục cuối).

> Thay cho `run --rm flyway migrate`, chạy `docker compose up -d` cũng được — service `flyway` sẽ chạy lại và áp dụng phần còn thiếu.

### Seed dữ liệu

Có hai loại dữ liệu khởi tạo, đặt ở hai thư mục khác nhau:

| Loại | Thư mục | Chạy ở | Ví dụ |
|---|---|---|---|
| **Dữ liệu tham chiếu** — hệ thống cần mới chạy được | `migrations/` | dev **và** production | danh mục vai trò, mã trạng thái |
| **Dữ liệu mẫu** — chỉ để dev/demo | `seed/` | **chỉ dev** | tài khoản test `password123`, đơn mẫu |

`docker-compose.yml` (dev) chạy cả hai thư mục; image `migrate` của production (`db/Dockerfile`) chỉ đóng gói `migrations/`. Đừng bao giờ đặt tài khoản có mật khẩu cố định vào `migrations/` — nó sẽ lên production.

Lưu ý: Flyway đánh số version **chung** cho cả hai thư mục, nên file mới ở `seed/` không được trùng số với `migrations/`. Với seed hay thay đổi, dùng file repeatable `seed/R__seed_xxx.sql` (viết `INSERT ... ON DUPLICATE KEY UPDATE` để chạy lại an toàn) thay vì chiếm số version.

### Lệnh Flyway hữu ích

```bash
docker compose run --rm flyway info      # bảng trạng thái từng migration (Pending/Success)
docker compose run --rm flyway migrate   # áp dụng migration còn thiếu
docker compose run --rm flyway validate  # kiểm tra checksum (phát hiện file đã bị sửa)
docker compose run --rm flyway repair    # sửa flyway_schema_history (xóa dòng failed / cập nhật checksum)
```

Xem lịch sử trực tiếp trong DB:

```bash
docker exec webapp-mysql mysql -uwebapp_db -pwebapp@123 webapp_db \
  -e "SELECT installed_rank, version, description, success FROM flyway_schema_history;"
```

## Kết nối tới database

**Dùng mysql client trong container:**

```bash
docker exec -it webapp-mysql mysql -uwebapp_db -pwebapp@123 webapp_db
```

**Dùng client/GUI trên host** (MySQL Workbench, DBeaver, TablePlus, `mysql` CLI…):

| Thông số | Giá trị |
|---|---|
| Host | `localhost` |
| Port | `3306` (hoặc `MYSQL_PORT`) |
| Database | giá trị `MYSQL_DATABASE` (vd `webapp_db`) |
| User / Password | `MYSQL_USER` / `MYSQL_PASSWORD` |

## Làm lại database từ đầu

```bash
docker compose down -v    # XÓA volume → mất TOÀN BỘ dữ liệu
docker compose up -d       # tạo mới và chạy lại mọi migration từ V1
```

Dùng khi muốn một DB sạch, hoặc khi đã lỡ sửa một migration cũ và cần dựng lại từ đầu.

## Xử lý sự cố

| Triệu chứng | Nguyên nhân & cách xử lý |
|---|---|
| `flyway` log: `RSA public key is not available client side` | MySQL 8.4 dùng `caching_sha2_password`. JDBC URL trong `docker-compose.yml` đã thêm `?allowPublicKeyRetrieval=true&useSSL=false` để xử lý — nếu tự chỉnh URL nhớ giữ lại tham số này. |
| `flyway` chỉ in usage/help, không migrate | `command` phải ở **dạng list** trong compose, nếu không ký tự `&` trong URL bị shell hiểu là chạy nền và cắt mất lệnh. Giữ nguyên dạng list hiện có. |
| `Validate failed: ... checksum mismatch` | Một migration versioned đã chạy bị sửa nội dung. Hoàn tác thay đổi file, HOẶC tạo migration mới, HOẶC (chỉ ở dev) `flyway repair` rồi `migrate`. |
| Migration lỗi giữa chừng, dòng `success=0` trong history | Sửa lỗi SQL trong file, chạy `flyway repair` (xóa dòng failed) rồi `flyway migrate` lại. |
| `Bind for 0.0.0.0:3306 failed: port is already allocated` | Cổng 3306 đã bị MySQL khác chiếm. Đổi `MYSQL_PORT` trong `.env` (vd `3307`) rồi `docker compose up -d`. |
| Đổi mật khẩu/tên DB trong `.env` nhưng không có hiệu lực | Các biến `MYSQL_*` chỉ áp dụng khi volume được **tạo mới**. Chạy `docker compose down -v && docker compose up -d` (mất dữ liệu). |
| `flyway` báo `No migration necessary` | Bình thường — mọi migration đã được áp dụng rồi. |

## Quan hệ với backend (.NET)

- **Flyway là nguồn chân lý (source of truth) của schema.** Backend KHÔNG dùng EF Core migrations để tạo bảng.
- Entity trong `api/api/Models/*.cs` **map** vào bảng có sẵn (database-first) bằng **data annotation** (`[Table]`, `[Column]`, `[Key]`, `[Index]`, …). `AppDbContext` chỉ khai báo `DbSet<>`, không cấu hình mapping. Khi thêm/sửa cột qua migration, nếu code cần dùng cột đó, phải cập nhật **cả hai nơi**:
  1. File migration SQL trong `db/migrations/` (tạo/sửa cột — quyết định schema thật).
  2. Annotation trên property tương ứng trong entity `api/api/Models/*.cs` (để code đọc/ghi đúng). Lưu ý giữ `[Column]`/`[MaxLength]` khớp với định nghĩa trong migration.
- Connection string trong `api/api/appsettings.Development.json` phải khớp `.env`:

  ```
  Server=localhost;Port=3306;Database=<MYSQL_DATABASE>;User=<MYSQL_USER>;Password=<MYSQL_PASSWORD>;
  ```
