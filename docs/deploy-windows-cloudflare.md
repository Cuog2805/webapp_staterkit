# Chạy thử trên máy Windows qua Cloudflare Tunnel

Mục tiêu: chưa có VPS, vẫn đưa app ra Internet bằng domain thật (`https://test.<domain>`) với **đúng stack production** (`deploy/docker-compose.yml`), chạy trên máy Windows của bạn.

Đọc trước [`deploy.md`](deploy.md) mục 1 (kiến trúc). Tài liệu này chỉ nói phần khác biệt.

## Mục lục

1. [Cách hoạt động và giới hạn](#1-cách-hoạt-động-và-giới-hạn)
2. [Chuẩn bị Windows: WSL2 + Docker](#2-chuẩn-bị-windows-wsl2--docker)
3. [Chuẩn bị Cloudflare](#3-chuẩn-bị-cloudflare)
4. [Chạy lần đầu (build từ mã nguồn)](#4-chạy-lần-đầu-build-từ-mã-nguồn)
5. [Tập quy trình phát hành thật (GitHub Actions → GHCR)](#5-tập-quy-trình-phát-hành-thật-github-actions--ghcr)
6. [Vận hành hằng ngày](#6-vận-hành-hằng-ngày)
7. [Khi chuyển lên VPS](#7-khi-chuyển-lên-vps)
8. [Xử lý sự cố](#8-xử-lý-sự-cố)

---

## 1. Cách hoạt động và giới hạn

```
Trình duyệt ──HTTPS──► Cloudflare ══ tunnel (outbound) ══► cloudflared ──HTTP──► caddy:80 ──► web / api
                       (TLS, DNS)                          └──────────── máy Windows (WSL2 + Docker) ─────┘
```

- `cloudflared` **chủ động kết nối ra** Cloudflare. Không cần IP public, không mở cổng router, không cấu hình firewall Windows.
- Cloudflare lo HTTPS với trình duyệt; Caddy chỉ chạy HTTP nội bộ (`deploy/caddy/Caddyfile.tunnel`).
- Bật bằng một dòng trong `.env`: `COMPOSE_FILE=docker-compose.yml:docker-compose.tunnel.yml`. Mọi lệnh `docker compose` và `scripts/*.sh` tự dùng thêm file override này.

**Giới hạn — đây là môi trường test, không phải production:**

- Máy tắt, ngủ, mất mạng ⇒ site sập (Cloudflare hiện lỗi 1033). Tắt chế độ Sleep khi cần chạy lâu.
- Dữ liệu nằm trên ổ máy bạn: đừng nhập dữ liệu thật của khách hàng.
- GitHub Actions **không** tự deploy vào máy bạn được (không có đường vào từ ngoài) — bạn chạy `deploy.sh` bằng tay. Xem [mục 5](#5-tập-quy-trình-phát-hành-thật-github-actions--ghcr).

## 2. Chuẩn bị Windows: WSL2 + Docker

**Làm mọi thứ bên trong WSL2 (Ubuntu), không làm trong PowerShell.** Lý do: các script là bash, và WSL2 *chính là* một máy Linux — giống hệt VPS sau này, nên những gì bạn học ở đây dùng lại nguyên vẹn.

### 2.1. Cài WSL2

PowerShell (Run as Administrator):

```powershell
wsl --install -d Ubuntu-24.04
```

Khởi động lại máy, mở "Ubuntu" từ Start menu, tạo user/mật khẩu Linux.

Yêu cầu: Windows 10 22H2 hoặc Windows 11, bật ảo hoá (Virtualization) trong BIOS. RAM: stack dùng khoảng 1.5–2 GB; máy 8 GB chạy được, 16 GB thoải mái.

### 2.2. Cài Docker — chọn một

**Khuyên dùng: Docker Engine ngay trong WSL** — giống hệt cách cài trên VPS (một lần học, dùng hai nơi), và miễn phí cho mọi mục đích.

Trong terminal Ubuntu, làm theo https://docs.docker.com/engine/install/ubuntu/ (phần "Install using the apt repository"), rồi:

```bash
sudo usermod -aG docker $USER      # đóng terminal Ubuntu, mở lại
docker run --rm hello-world        # kiểm tra
```

Ubuntu 24.04 trên WSL bật sẵn systemd nên Docker tự chạy khi mở WSL. Kiểm tra: `systemctl is-active docker`.

**Hoặc: Docker Desktop** (giao diện đồ hoạ, bật Settings → Resources → WSL integration → Ubuntu-24.04).

> ⚠️ Docker Desktop **chỉ miễn phí** cho cá nhân, học tập và doanh nghiệp nhỏ (< 250 nhân viên **và** < 10 triệu USD doanh thu). Nếu sau này mang cách làm này vào dự án ở công ty lớn, Docker Desktop cần license trả phí — Docker Engine trong WSL thì không. Thêm một lý do để chọn cách trên.

### 2.3. Clone repo **trong** filesystem của WSL

```bash
cd ~
git clone https://github.com/Cuog2805/webapp_staterkit.git
cd webapp_staterkit/deploy
```

Đừng clone vào `C:\...` rồi truy cập qua `/mnt/c/...`: chậm hơn nhiều lần, sai quyền file, và dễ dính lỗi xuống dòng CRLF làm hỏng script bash (repo đã có `.gitattributes` để giảm rủi ro này, nhưng clone trong WSL là chắc chắn nhất).

## 3. Chuẩn bị Cloudflare

### 3.1. Đưa domain vào Cloudflare

1. https://dash.cloudflare.com → **Add a domain** → nhập domain → chọn gói **Free**.
2. Cloudflare cho 2 nameserver. Vào nơi bạn **mua domain** (Mắt Bão, PA Vietnam, Namecheap…), đổi nameserver của domain sang 2 cái đó.
3. Chờ trạng thái domain trên Cloudflare chuyển **Active** (vài phút đến vài giờ).

> Domain `.vn`: đổi nameserver qua nhà đăng ký được VNNIC ủy quyền, thường mất lâu hơn — làm bước này sớm.

### 3.2. Tạo tunnel

1. Dashboard → **Zero Trust** → **Networks** → **Tunnels** → **Create a tunnel** → chọn **Cloudflared**.
2. Đặt tên, vd `webapp-test`.
3. Màn hình "Install and run a connector" hiện một lệnh dạng `cloudflared service install eyJh...`. **Không chạy lệnh đó** — chỉ copy chuỗi token dài sau `install` (bắt đầu bằng `eyJ`). Bạn sẽ chạy cloudflared bằng Docker.
4. **Public Hostname** (hoặc "Route traffic"):
   - Subdomain: `test` · Domain: domain của bạn
   - Service Type: `HTTP` · URL: `caddy:80`

   `caddy:80` là tên service trong Docker network — cloudflared chạy cùng network với Caddy nên phân giải được. **Không** dùng `localhost:80`.
5. Lưu. Cloudflare tự tạo bản ghi DNS `CNAME test → <id>.cfargotunnel.com`.

> Token tunnel là **secret**: ai có nó là chạy được tunnel của bạn và nhận traffic của `test.<domain>`. Chỉ để trong `deploy/.env`, không dán vào chat, không commit. Lộ thì vào dashboard tunnel → refresh token.

### 3.3. Cài đặt nên bật

- **SSL/TLS → Edge Certificates → Always Use HTTPS**: bật (Caddy ở chế độ tunnel không tự redirect HTTP→HTTPS, việc này giao cho Cloudflare).
- **Minimum TLS Version**: 1.2.
- **Khuyên dùng — khoá site test bằng Cloudflare Access**: Zero Trust → **Access** → **Applications** → Add → Self-hosted → domain `test.<domain>` → policy *Allow* với *Emails* = email của bạn. Người lạ mở site sẽ phải xác thực email trước. Site test công khai với chức năng đăng ký mở là mục tiêu dễ bị bot spam; khoá lại thì bạn test thoải mái.

## 4. Chạy lần đầu (build từ mã nguồn)

Lần đầu, build image ngay trên máy để tách biến số: nếu hỏng thì chắc chắn là phần tunnel/cấu hình, chưa dính tới registry.

```bash
cd ~/webapp_staterkit/deploy
cp .env.example .env
chmod 600 .env
nano .env
```

Sửa trong `.env`:

```bash
COMPOSE_FILE=docker-compose.yml:docker-compose.local.yml:docker-compose.tunnel.yml
DOMAIN=test.<domain-của-bạn>
IMAGE_PREFIX=webapp
TAG=local
TUNNEL_TOKEN=eyJh...              # token ở bước 3.2
MYSQL_ROOT_PASSWORD=...           # mỗi cái một giá trị ngẫu nhiên:
MYSQL_PASSWORD=...                #   openssl rand -base64 48 | tr -d '/+=' | cut -c1-40
APP_DB_PASSWORD=...
JWT_KEY=...
```

Chạy:

```bash
docker compose up -d --build --wait
docker compose ps -a
docker compose logs cloudflared | grep -i registered    # thấy "Registered tunnel connection" ×4 là tunnel đã thông
```

Mở `https://test.<domain>` — có HTTPS hợp lệ, không cảnh báo cert.

Tự kiểm tra (và hiểu vì sao):

```bash
curl -sI http://test.<domain>              # 301 → https (Cloudflare "Always Use HTTPS")
curl -s https://test.<domain>/health       # 404: /health của API không lộ ra ngoài
ss -ltn | grep -E ':(80|443) ' || echo "không mở cổng nào — đúng"
docker compose logs caddy | grep -o '"client_ip":"[^"]*"' | tail -3   # IP thật của bạn, không phải IP container
```

> DB production không có dữ liệu mẫu (xem `deploy.md` mục 3) — danh mục giải pháp sẽ trống, tài khoản `password123` không tồn tại. Tự đăng ký tài khoản mới để test.

## 5. Tập quy trình phát hành thật (GitHub Actions → GHCR)

Khi bước 4 chạy ổn, chuyển sang đúng quy trình sẽ dùng với VPS: **CI build image, máy chạy chỉ kéo image về**.

### 5.1. Một lần: cho máy kéo được image từ GHCR

GitHub → Settings → Developer settings → Personal access tokens → **Tokens (classic)** → scope **chỉ** `read:packages`. Trong WSL:

```bash
echo <TOKEN> | docker login ghcr.io -u <github-user> --password-stdin
```

### 5.2. Đổi `.env` sang chế độ kéo image

```bash
COMPOSE_FILE=docker-compose.yml:docker-compose.tunnel.yml     # bỏ docker-compose.local.yml
IMAGE_PREFIX=ghcr.io/cuog2805/webapp_staterkit                # chữ thường
```

### 5.3. Phát hành

Trên máy dev (sau khi code đã merge vào `main`):

```bash
git tag v0.1.0
git push origin v0.1.0
```

Workflow **Deploy** chạy: CI → build → push 3 image lên GHCR. Vì repo chưa bật `SSH_DEPLOY`, job SSH được bỏ qua; trang **Summary** của lần chạy ghi sẵn lệnh cần chạy, dạng:

```bash
cd ~/webapp_staterkit/deploy
scripts/deploy.sh sha-1a2b3c4
```

Chạy lệnh đó trong WSL. Rollback: `scripts/deploy.sh --rollback`. Đây đúng là những gì job SSH sẽ làm hộ bạn khi có VPS.

### Vì sao không để GitHub Actions tự deploy vào máy Windows?

Có cách: cài **self-hosted runner** trên máy bạn. Nhưng runner đó chạy *bất kỳ code nào* trong workflow — với repo public, một PR từ người lạ có thể chạy lệnh trên máy bạn. GitHub khuyến cáo không dùng self-hosted runner cho repo public. Với môi trường test, gõ một lệnh bằng tay rẻ hơn nhiều so với rủi ro đó.

## 6. Vận hành hằng ngày

```bash
cd ~/webapp_staterkit/deploy
docker compose ps                     # trạng thái
docker compose logs -f api            # xem log API
docker compose stop                   # tắt site (giữ dữ liệu)
docker compose start                  # bật lại
scripts/backup.sh                     # backup DB → /var/backups/webapp (cần sudo mkdir + chown lần đầu)
```

Khi mở lại máy: WSL không tự chạy khi Windows khởi động. Mở terminal Ubuntu một lần là Docker và stack (`restart: unless-stopped`) tự lên lại.

## 7. Khi chuyển lên VPS

Hai lựa chọn, đều hợp lệ cho production:

- **Giữ tunnel trên VPS**: copy `.env` (đổi secret mới!), giữ dòng `COMPOSE_FILE` có `docker-compose.tunnel.yml`. VPS không cần mở cổng 80/443 nào — chỉ SSH. Đây là cách nhiều người dùng thật để giấu IP server.
- **Chế độ public** (Caddy tự xin cert): bỏ dòng `COMPOSE_FILE`, đổi bản ghi DNS sang `A` trỏ IP VPS, làm theo `deploy.md` mục 4.

Rồi bật deploy tự động: thêm repository variable `SSH_DEPLOY=true` và các secret SSH (`deploy.md` mục 5).

## 8. Xử lý sự cố

| Triệu chứng | Nguyên nhân / cách xử lý |
|---|---|
| Trang lỗi Cloudflare **1033** | Tunnel chưa kết nối. `docker compose logs cloudflared`: token sai/thiếu, hoặc máy mất mạng |
| Trang lỗi **502 Bad Gateway** | cloudflared không tới được Caddy: Public Hostname phải là `HTTP` + `caddy:80` (không phải `localhost`, không phải `HTTPS`). Hoặc caddy chưa chạy: `docker compose ps` |
| `TUNNEL_TOKEN is required in tunnel mode` | `.env` thiếu `TUNNEL_TOKEN` hoặc còn để trống |
| `$'\r': command not found` khi chạy script | File bị đổi sang CRLF. Clone lại repo **trong WSL** (mục 2.3), hoặc `sed -i 's/\r$//' scripts/*.sh` |
| `denied` / `unauthorized` khi pull `ghcr.io/...` | Chưa `docker login ghcr.io` (5.1), hoặc `IMAGE_PREFIX` có chữ hoa |
| `deploy.sh` báo `not found` | Tag không tồn tại — copy đúng tag ở trang Summary của workflow |
| Redirect vô hạn (`ERR_TOO_MANY_REDIRECTS`) | Hiếm ở chế độ tunnel. Kiểm tra không có Page Rule/Redirect Rule nào ép HTTPS→HTTP; chế độ SSL không ảnh hưởng tunnel |
| `docker: permission denied` | Chưa vào nhóm docker: `sudo usermod -aG docker $USER`, mở lại terminal |
| Máy chậm/hết RAM | `docker stats`. Có thể giới hạn RAM của WSL qua `%UserProfile%\.wslconfig` (`[wsl2]` / `memory=6GB`) |
