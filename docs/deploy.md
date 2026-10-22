# Deploy lên production

Tài liệu này vừa là **hướng dẫn thao tác** vừa giải thích **vì sao** làm như vậy. Mục tiêu là sau khi đọc xong, bạn có thể tự dựng lại cách deploy này cho dự án khác.

## Mục lục

1. [Kiến trúc](#1-kiến-trúc)
2. [Các file liên quan](#2-các-file-liên-quan)
3. [Tập chạy trên máy mình trước](#3-tập-chạy-trên-máy-mình-trước)
4. [Chuẩn bị server lần đầu](#4-chuẩn-bị-server-lần-đầu)
5. [Cấu hình GitHub Actions](#5-cấu-hình-github-actions)
6. [Phát hành, rollback](#6-phát-hành-rollback)
7. [Backup & restore](#7-backup--restore)
8. [Migration an toàn khi deploy](#8-migration-an-toàn-khi-deploy)
9. [Các quyết định thiết kế và lý do](#9-các-quyết-định-thiết-kế-và-lý-do)
10. [Cố ý chưa làm — khi nào cần thêm](#10-cố-ý-chưa-làm--khi-nào-cần-thêm)
11. [Tái sử dụng cho dự án khác](#11-tái-sử-dụng-cho-dự-án-khác)
12. [Xử lý sự cố](#12-xử-lý-sự-cố)

---

## 1. Kiến trúc

```
                      Internet
                         │  :80 / :443  (cổng DUY NHẤT mở ra ngoài)
                ┌────────▼────────┐
                │      Caddy      │  TLS (Let's Encrypt), HTTP→HTTPS, security headers
                └───┬─────────┬───┘
       /api/*       │         │   mọi path khác
          ┌─────────▼──┐   ┌──▼─────────┐
          │    api     │   │    web     │      ← mạng "edge"
          │ ASP.NET    │   │ Next.js    │
          └─────┬──────┘   └────────────┘
                │                                ← mạng "backend" (internal, không ra Internet)
          ┌─────▼──────┐   ┌────────────┐
          │   mysql    │◄──│  migrate   │  Flyway: chạy migration rồi thoát
          └────────────┘   └────────────┘
```

**Tất cả chạy trên 1 VM bằng Docker Compose.** Với side project hoặc hệ thống nội bộ ít người dùng, cách này đủ dùng, rẻ, và quan trọng nhất là *bạn hiểu được từng mảnh*. Kubernetes giải quyết những vấn đề (hàng chục service, autoscale, nhiều team) mà dự án này chưa có — dùng nó bây giờ chỉ thêm độ phức tạp.

Thứ tự khởi động do `depends_on` đảm bảo:

```
mysql healthy → migrate exit 0 → api healthy ─┐
                                 web healthy ─┴→ caddy
```

Nếu migration lỗi, API **không khởi động** — tốt hơn nhiều so với API chạy trên schema sai.

## 2. Các file liên quan

| File | Vai trò |
|---|---|
| `api/Dockerfile` | Build API: stage SDK để publish, stage runtime nhỏ chạy bằng user không-root |
| `my-app/Dockerfile` | Build frontend: `output: "standalone"` → image không mang theo cả `node_modules` |
| `db/Dockerfile` | Image `migrate` = Flyway + `db/migrations/` (không có `db/seed/`) |
| `deploy/docker-compose.yml` | Stack production — file duy nhất cần trên server (cùng các file dưới) |
| `deploy/docker-compose.local.yml` | Override thêm `build:` để chạy thử stack prod từ mã nguồn |
| `deploy/Caddyfile` | Reverse proxy + TLS |
| `deploy/.env.example` | Mẫu biến môi trường/secret. Bản thật `.env` chỉ nằm trên server |
| `deploy/mysql-init/01-app-user.sh` | Tạo user DB quyền tối thiểu cho API (chạy 1 lần khi volume trống) |
| `deploy/scripts/deploy.sh` | Deploy / rollback theo tag image |
| `deploy/scripts/backup.sh`, `restore.sh` | Sao lưu / khôi phục DB |
| `.github/workflows/ci.yml` | Lint, test, build thử image ở mỗi PR |
| `.github/workflows/deploy.yml` | Build → push GHCR → SSH vào server chạy `deploy.sh` |

## 3. Tập chạy trên máy mình trước

Luôn chạy thử **đúng stack production** ở local trước khi đụng tới server. Lỗi Dockerfile, sai biến môi trường, sai thứ tự khởi động… đều lộ ra ở đây, rẻ hơn nhiều so với lộ ra trên server.

```bash
cd deploy
cp .env.example .env
# Sửa trong .env:  DOMAIN=localhost, IMAGE_PREFIX=webapp, TAG=local,
#                  và đặt các mật khẩu / JWT_KEY (≥ 32 ký tự)
docker compose -f docker-compose.yml -f docker-compose.local.yml up -d --build --wait
```

Mở https://localhost (trình duyệt cảnh báo cert vì Caddy tự cấp cert nội bộ cho localhost — bình thường).

Những thứ nên tự kiểm tra (và hiểu vì sao nó đúng):

```bash
docker compose ps -a                          # migrate: Exited (0), còn lại healthy
curl -kI http://localhost                     # 308 → https
curl -kI https://localhost                    # có Strict-Transport-Security, X-Frame-Options
curl -k https://localhost/health              # 404: /health của API không lộ ra ngoài
docker compose logs migrate                   # Flyway đã áp dụng migration nào

# User của API không có quyền DDL:
docker compose exec mysql sh -c 'MYSQL_PWD="$APP_DB_PASSWORD" mysql -u"$APP_DB_USER" -e "SHOW GRANTS"'
```

Dọn dẹp: `docker compose down` (giữ dữ liệu) hoặc `docker compose down -v` (xoá cả volume DB + cert).

> **Lưu ý:** DB production **không có dữ liệu mẫu** (`db/seed/` chỉ chạy ở dev). Nghĩa là danh mục giải pháp cũng trống. Nếu danh mục là dữ liệu thật cần có sẵn, hãy viết một migration riêng (vd `db/migrations/V5__solutions_catalog.sql`) — tách bạch với tài khoản test.

## 4. Chuẩn bị server lần đầu

Ví dụ với VPS Ubuntu 24.04, ≥ 2 vCPU / 4 GB RAM (MySQL + .NET + Node). Làm một lần.

### 4.1. Truy cập an toàn

```bash
# Trên máy mình: tạo key riêng cho server này
ssh-keygen -t ed25519 -f ~/.ssh/webapp_server
ssh-copy-id -i ~/.ssh/webapp_server.pub root@<IP>

# Trên server: tạo user thường, không làm việc bằng root
adduser deploy
usermod -aG sudo deploy
rsync -a ~/.ssh /home/deploy/ && chown -R deploy:deploy /home/deploy/.ssh
```

Tắt đăng nhập bằng mật khẩu và root trong `/etc/ssh/sshd_config` (`PasswordAuthentication no`, `PermitRootLogin no`), rồi `systemctl restart ssh`. **Mở một phiên SSH thứ hai bằng user `deploy` để chắc chắn vào được trước khi đóng phiên root.**

### 4.2. Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 443/udp
sudo ufw enable
```

> ⚠️ **Bẫy kinh điển:** cổng Docker publish (`ports:`) **đi vòng qua ufw** — Docker tự ghi rule iptables. ufw báo "chặn 3306" nhưng nếu compose có `ports: "3306:3306"` thì MySQL vẫn lộ ra Internet. Vì vậy `deploy/docker-compose.yml` chỉ publish 80/443, và MySQL nằm trong mạng `internal`. Đừng thêm `ports:` cho mysql/api/web.

Cập nhật bảo mật tự động: `sudo apt install unattended-upgrades`.

### 4.3. Cài Docker

Theo hướng dẫn chính thức (https://docs.docker.com/engine/install/ubuntu/), rồi:

```bash
sudo usermod -aG docker deploy   # đăng xuất/đăng nhập lại để có hiệu lực
docker compose version
```

> Thêm user vào nhóm `docker` ≈ cho quyền root (ai điều khiển Docker daemon thì điều khiển được cả máy). Chấp nhận được với server một người quản lý; biết điều này để không cấp bừa cho người khác.

### 4.4. DNS

Tạo bản ghi `A` cho domain (vd `app.example.com`) trỏ về IP server. Phải xong **trước** lần chạy đầu — Caddy cần domain trỏ đúng thì Let's Encrypt mới cấp cert. Kiểm tra: `dig +short app.example.com`.

### 4.5. Thư mục deploy và secret

```bash
sudo mkdir -p /opt/webapp && sudo chown deploy:deploy /opt/webapp
# Copy (lần đầu, bằng tay; về sau CI tự đồng bộ): docker-compose.yml, Caddyfile, mysql-init/, scripts/, .env.example
cd /opt/webapp
cp .env.example .env && chmod 600 .env
nano .env
```

Sinh mỗi secret một giá trị ngẫu nhiên riêng:

```bash
openssl rand -base64 48 | tr -d '/+=' | cut -c1-40
```

`IMAGE_PREFIX` = `ghcr.io/<github-user>/<repo>` **viết thường**.

### 4.6. Đăng nhập registry

Image trên GHCR của repo private là private. Tạo GitHub **Personal Access Token (classic)** chỉ có scope `read:packages`, rồi trên server:

```bash
echo <TOKEN> | docker login ghcr.io -u <github-user> --password-stdin
```

Nên đăng nhập cả Docker Hub (tài khoản free) — pull ẩn danh bị giới hạn số lượt theo IP, VPS dùng chung IP rất dễ dính lỗi `429 Too Many Requests` khi kéo `mysql`/`caddy`.

### 4.7. Backup tự động

```bash
sudo mkdir -p /var/backups/webapp && sudo chown deploy:deploy /var/backups/webapp
crontab -e
# 15 2 * * * /opt/webapp/scripts/backup.sh >> /opt/webapp/backup.log 2>&1
```

Xem thêm [mục 7](#7-backup--restore) về đưa backup ra khỏi server.

## 5. Cấu hình GitHub Actions

Repo → **Settings → Environments → New environment** tên `production`:

| Loại | Tên | Giá trị |
|---|---|---|
| Secret | `SSH_HOST` | IP hoặc domain server |
| Secret | `SSH_USER` | `deploy` |
| Secret | `SSH_PRIVATE_KEY` | Private key **riêng cho CI** (tạo key mới, thêm public key vào `~deploy/.ssh/authorized_keys`) |
| Secret | `SSH_KNOWN_HOSTS` | Output của `ssh-keyscan -H <IP>` |
| Variable | `DEPLOY_PATH` | `/opt/webapp` (mặc định, có thể bỏ qua) |

Bật **Required reviewers** cho environment này: mỗi lần deploy cần bạn bấm duyệt. Thêm một bước dừng tay trước khi động vào production là thói quen tốt.

Vì sao key riêng cho CI: nếu lộ (vd ai đó sửa workflow để in secret), bạn chỉ cần thu hồi key đó, không ảnh hưởng key cá nhân.

## 6. Phát hành, rollback

### Phát hành

```bash
git tag v1.0.0
git push origin v1.0.0
```

Workflow **Deploy** sẽ: chạy lại toàn bộ CI → build 3 image → push lên GHCR với tag `sha-<7 ký tự commit>` (và `v1.0.0`) → chờ bạn duyệt → SSH vào server chạy `scripts/deploy.sh sha-xxxxxxx`.

Cũng có thể bấm tay: tab **Actions → Deploy → Run workflow**.

Vì sao **không** tự deploy mỗi lần push `main`: phát hành là một quyết định có chủ đích. Khi đã có test đủ tin cậy và staging, có thể chuyển sang continuous deployment — nhưng đó là bước sau.

Vì sao tag theo commit SHA thay vì `latest`: `latest` thay đổi âm thầm — bạn không biết server đang chạy code nào, và không thể rollback về "latest của hôm qua". Tag bất biến trả lời chính xác câu hỏi "prod đang chạy commit nào?".

### `deploy.sh` làm gì

1. `docker compose pull` image của tag mới **trước** khi đổi bất cứ gì → tag sai thì dừng, stack cũ vẫn chạy.
2. Ghi tag mới vào `.env`, lưu tag cũ vào `.deploy-history`.
3. `docker compose up -d --wait`: chạy migrate, thay container, chờ tất cả healthy. Không healthy trong 180s → lệnh trả lỗi → job CI đỏ.
4. Dọn image cũ không dùng.

### Rollback

```bash
cd /opt/webapp
scripts/deploy.sh --rollback          # về tag ngay trước đó
scripts/deploy.sh sha-1a2b3c4         # hoặc về một tag cụ thể
```

Rollback chỉ lùi **code**, không lùi **database** — xem mục 8.

### Downtime

Mỗi lần deploy có vài giây gián đoạn khi container API/web được thay. Với side project/hệ thống nội bộ, chấp nhận được. Zero-downtime cần chạy song song 2 phiên bản (blue-green) — chỉ đáng làm khi thật sự có yêu cầu.

## 7. Backup & restore

```bash
scripts/backup.sh                                   # → /var/backups/webapp/db-<thời gian>.sql.gz
scripts/restore.sh /var/backups/webapp/db-....sql.gz   # hỏi xác nhận, dừng API, restore, chạy lại API
```

Ba nguyên tắc:

1. **Backup cùng ổ với DB chưa phải là backup.** Server hỏng/bị xoá là mất cả hai. Đồng bộ `/var/backups/webapp` ra nơi khác — đơn giản nhất là [rclone](https://rclone.org) tới object storage (S3, Backblaze B2, Google Drive…), thêm một dòng cron sau `backup.sh`.
2. **Backup chưa từng restore thử thì không đáng tin.** Định kỳ (vd hàng tháng) restore vào stack chạy thử ở local và kiểm tra dữ liệu.
3. Volume `caddy-data` chứa cert TLS — mất thì Caddy tự xin lại, không cần backup. Volume `mysql-data` thì **tuyệt đối không** `docker compose down -v` trên production.

## 8. Migration an toàn khi deploy

Lúc deploy có một khoảng ngắn **schema mới + code cũ** cùng tồn tại (migrate chạy trước, API mới lên sau). Rollback cũng tạo ra **schema mới + code cũ**. Vì vậy mỗi migration phải tương thích ngược với bản code trước nó.

Quy tắc **expand → contract** (mở rộng trước, thu hẹp sau, tách nhiều lần deploy):

| Muốn | Sai (1 lần deploy) | Đúng |
|---|---|---|
| Thêm cột bắt buộc | `ADD COLUMN x NOT NULL` | Deploy 1: thêm cột nullable/có default + code ghi cột. Deploy 2: backfill rồi `NOT NULL` |
| Đổi tên cột | `RENAME COLUMN a TO b` | Deploy 1: thêm `b`, code ghi cả hai. Deploy 2: code chỉ đọc `b`. Deploy 3: xoá `a` |
| Xoá cột | `DROP COLUMN` cùng lúc bỏ code | Deploy 1: bỏ code dùng cột. Deploy 2: `DROP COLUMN` |

Và luôn **backup trước khi deploy có migration lớn**.

## 9. Các quyết định thiết kế và lý do

| Quyết định | Lý do | Đánh đổi |
|---|---|---|
| Một VM + Compose | Đơn giản, rẻ, dễ debug, đủ cho tải nhỏ | Một điểm lỗi duy nhất; scale theo chiều dọc |
| Caddy thay Nginx | Tự xin/gia hạn TLS, cấu hình ngắn | Ít tài liệu/ví dụ hơn Nginx |
| Frontend + API cùng domain | Không cần CORS; dễ chuyển sang cookie HttpOnly | Phải định tuyến theo path `/api` |
| `NEXT_PUBLIC_API_URL` rỗng khi build | Biến `NEXT_PUBLIC_*` bị nhúng cứng lúc build → để rỗng thì một image chạy được ở mọi môi trường | Không gọi được API ở domain khác |
| TLS kết thúc ở Caddy; API không `UseHttpsRedirection` | Một nơi duy nhất lo HTTPS/HSTS | API tin header `X-Forwarded-*` → API **không được** lộ trực tiếp ra ngoài |
| Image `migrate` riêng, chạy trước API | Migration có version cùng code; lỗi migration chặn API khởi động | Thêm một image phải build |
| Hai user DB (migrator / app) | API bị SQL injection cũng không `DROP` được bảng | Đổi mật khẩu phải `ALTER USER` thủ công |
| `seed/` tách khỏi `migrations/` | Tài khoản test `password123` không bao giờ lên prod | Version Flyway chung, phải tránh trùng số |
| Liveness `/health` không kiểm DB | DB chậm không làm Docker restart API vô ích | Không phát hiện được "API sống nhưng mất DB" |
| `MySqlServerVersion(8.4)` cố định | `AutoDetect` mở kết nối lúc khởi động → crash nếu DB chưa sẵn | Nâng cấp MySQL phải sửa code |
| `Jwt:Key` < 32 byte → không khởi động | Fail fast thay vì chạy với key yếu | — |
| Tag image theo commit SHA | Biết chính xác prod chạy gì; rollback được | Tag khó đọc hơn `v1.2.3` (nên có cả hai) |
| Deploy bằng tag git + duyệt tay | Phát hành có chủ đích | Chậm hơn continuous deployment |
| Log xoay vòng 5×10MB | Mặc định Docker log không giới hạn → đầy ổ | Log cũ bị mất — cần tập trung log nếu muốn giữ lâu |

## 10. Cố ý chưa làm — khi nào cần thêm

Thêm mọi thứ ngay từ đầu chỉ khiến hệ thống khó hiểu. Đây là danh sách nên làm tiếp, xếp theo mức ưu tiên cho một hệ thống có người dùng thật:

1. **Giám sát uptime** — [Uptime Kuma](https://github.com/louislam/uptime-kuma) (tự host, ở máy khác) hoặc UptimeRobot. *Làm ngay khi có người dùng thật*: bạn phải biết hệ thống sập trước khi người dùng báo.
2. **Backup ra ngoài server** (rclone) — làm cùng lúc với lần deploy thật đầu tiên.
3. **JWT trong cookie HttpOnly** thay vì `localStorage` — giảm thiệt hại khi bị XSS. Đã cùng domain nên làm khá gọn.
4. **Rate limiting** cho `/api/auth/*` (ASP.NET `AddRateLimiter`) — chống dò mật khẩu.
5. **Dependabot** (`.github/dependabot.yml`) cho npm, NuGet, Docker, GitHub Actions — cập nhật bản vá bảo mật.
6. **Pin GitHub Actions theo commit SHA** thay vì `@v4`, và **pin base image theo digest** — chống tấn công chuỗi cung ứng; dùng cùng Dependabot để vẫn được cập nhật.
7. **Quét lỗ hổng image** (Trivy) trong CI.
8. **Staging**: một stack thứ hai (domain khác, `.env` khác) — deploy staging trước, prod sau.
9. **Tập trung log + metrics** (Grafana Loki/Prometheus, hoặc dịch vụ SaaS) — khi `docker compose logs` không còn đủ.
10. **Managed MySQL** — khi dữ liệu quan trọng đến mức bạn không muốn tự lo backup/failover.
11. **Nhiều instance / zero-downtime** — chỉ khi một VM không đủ hoặc downtime vài giây là không chấp nhận được. Lúc đó mới cân nhắc tách DB, load balancer, và (có thể) Kubernetes.

## 11. Tái sử dụng cho dự án khác

Bộ khung này không phụ thuộc vào nghiệp vụ. Khi copy sang dự án mới:

- [ ] Copy `deploy/`, `.github/workflows/`, các `Dockerfile` + `.dockerignore`.
- [ ] Đổi `context` trong `docker-compose.local.yml` và matrix trong workflow nếu cấu trúc thư mục khác.
- [ ] API khác ASP.NET: giữ nguyên ý tưởng — app nghe HTTP nội bộ, có `/health`, đọc config từ biến môi trường, tin `X-Forwarded-*`.
- [ ] DB khác MySQL: thay service `mysql`, healthcheck, script `mysql-init/`, lệnh dump trong `backup.sh`.
- [ ] Không dùng Flyway: thay image `migrate` bằng công cụ migration của bạn — giữ nguyên nguyên tắc "migrate chạy xong rồi API mới lên".
- [ ] Đổi `Jwt__*`, các route trong `Caddyfile` theo app mới.
- [ ] Chạy lại toàn bộ [mục 3](#3-tập-chạy-trên-máy-mình-trước) trước khi lên server.

## 12. Xử lý sự cố

| Triệu chứng | Kiểm tra |
|---|---|
| Caddy không có cert, trình duyệt báo lỗi TLS | DNS đã trỏ đúng IP chưa (`dig`)? Cổng 80/443 có mở không? `docker compose logs caddy` |
| `api` không lên, `migrate` exit ≠ 0 | `docker compose logs migrate` — migration SQL lỗi; sửa bằng migration mới, không sửa file đã áp dụng |
| `api` restart liên tục | `docker compose logs api` — thường là thiếu/sai `JWT_KEY`, sai mật khẩu DB |
| API báo `Access denied` với DB | User app chỉ được tạo khi volume **trống**. Volume cũ (tạo trước khi có `mysql-init/`) → tạo user bằng tay theo nội dung `01-app-user.sh` |
| `deploy.sh` báo `not found` khi pull | Tag không tồn tại trên registry, hoặc server chưa `docker login ghcr.io` |
| `429 Too Many Requests` khi pull | Giới hạn pull ẩn danh của Docker Hub → `docker login` |
| Hết ổ đĩa | `docker system df`; `docker image prune -a` (cẩn thận: xoá cả image dùng để rollback) |
| Cần vào DB | `docker compose exec mysql sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"'` |
