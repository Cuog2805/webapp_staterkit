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
3. Màn hình **"Install and run a connector"** cho chọn môi trường (Windows, Mac, Debian, Red Hat, Docker…). Chọn tab **Docker**, sẽ thấy lệnh dạng:

   ```
   docker run cloudflare/cloudflared:latest tunnel --no-autoupdate run --token eyJhIjoiNGY...
   ```

   **Không chạy lệnh này.** Chỉ copy phần sau `--token ` — chuỗi dài bắt đầu bằng `eyJ`, không có dấu cách, thường vài trăm ký tự. Copy đủ tới ký tự cuối. Token này sẽ vào `deploy/.env`; cloudflared được chạy bởi Docker Compose cùng với cả stack — lý do và cách làm ở [mục 4.2](#42-cloudflared-chạy-bằng-docker-như-thế-nào).

   Nếu wizard chưa cho bấm **Next** khi chưa có connector nào kết nối: làm [mục 4](#4-chạy-lần-đầu-build-từ-mã-nguồn) trước, quay lại đây khi tunnel báo **HEALTHY**.
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

### 4.1. Tạo `.env`

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

`TUNNEL_TOKEN` viết liền một dòng, **không** có dấu ngoặc kép, không có dấu cách hai bên `=`.

### 4.2. cloudflared chạy bằng Docker như thế nào

**Vì sao không chạy lệnh Cloudflare đưa ra?** Cả hai cách dashboard gợi ý đều đặt cloudflared *ngoài* mạng Docker của stack:

```
❌ cloudflared service install (Windows service)      ❌ docker run ... (container lẻ)
   cloudflared ở Windows host                           cloudflared ở mạng "bridge" mặc định
        │ "caddy:80" là gì? → không phân giải được           │ "caddy:80" là gì? → không phân giải được
        ▼                                                    ▼
   phải dùng localhost:80 ⇒ phải publish cổng Caddy      không thuộc compose: không có trong
   ra máy ⇒ mất ý nghĩa của tunnel                       `docker compose ps`, dùng tag :latest

✅ Service "cloudflared" trong docker-compose.tunnel.yml
   cloudflared ──(mạng Docker "webapp_edge")──► caddy:80      Docker DNS phân giải "caddy"
   bật/tắt/log/restart cùng stack, version cố định 2025.11.1
```

**Token đi từ đâu tới đâu:**

```
deploy/.env              docker-compose.tunnel.yml                container cloudflared
TUNNEL_TOKEN=eyJ...  ──► environment:                      ──►  biến môi trường TUNNEL_TOKEN
                           TUNNEL_TOKEN: ${TUNNEL_TOKEN}         cloudflared tự đọc (tương đương --token)
```

Vì vậy service chỉ cần lệnh `tunnel --no-autoupdate run` — không có `--token` trên dòng lệnh, nên token không hiện trong `docker ps` hay `docker inspect` phần command. (`--no-autoupdate`: trong container, nâng version bằng cách đổi tag image, không để cloudflared tự tải bản mới.)

Toàn bộ service (đọc trong `deploy/docker-compose.tunnel.yml`):

```yaml
cloudflared:
  image: cloudflare/cloudflared:2025.11.1
  restart: unless-stopped
  command: ["tunnel", "--no-autoupdate", "run"]
  environment:
    TUNNEL_TOKEN: ${TUNNEL_TOKEN:?TUNNEL_TOKEN is required in tunnel mode}
  networks: [edge]          # cùng mạng với caddy
```

Tên `caddy` trong URL `caddy:80` ở dashboard chính là **tên service** trong compose. Docker có DNS nội bộ cho mỗi mạng: container nào cùng mạng `edge` hỏi "caddy" sẽ nhận IP của container Caddy. Đổi tên service thì phải đổi URL trên dashboard theo.

### 4.3. Khởi động từng bước, kiểm tra từng lớp

Chạy cả stack một lệnh cũng được (`docker compose up -d --build --wait`), nhưng **lần đầu nên lên từng lớp**: lớp nào hỏng thì biết ngay, không phải đoán.

**Bước 1 — app (chưa có tunnel):**

```bash
cd ~/webapp_staterkit/deploy
docker compose config --quiet && echo "cấu hình OK"      # bắt lỗi .env trước khi chạy gì
docker compose up -d --build --wait caddy                # kéo theo mysql, migrate, api, web
docker compose ps -a                                     # migrate: Exited (0), còn lại Up/healthy
```

Lần đầu build mất vài phút. Không dùng `docker compose config` không có `--quiet` — nó in toàn bộ cấu hình, **kể cả token và mật khẩu**, ra màn hình.

**Bước 2 — kiểm tra Caddy từ trong mạng Docker,** đúng vị trí cloudflared sẽ đứng:

```bash
docker run --rm --network webapp_edge curlimages/curl:8.11.1 -sI http://caddy:80
```

Thấy `HTTP/1.1 200 OK` ⇒ phần của bạn đã xong (không in gì ⇒ Caddy vừa khởi động, đợi vài giây chạy lại); nếu lát nữa site lỗi thì lỗi nằm ở tunnel/dashboard. (`webapp_edge` = tên project `webapp` + tên mạng `edge`; kiểm tra bằng `docker network ls`. Image cloudflared không có shell nên không `exec` vào nó để curl được — mới phải mượn container curl.)

**Bước 3 — bật tunnel:**

```bash
docker compose up -d cloudflared
docker compose logs -f cloudflared          # Ctrl+C để thoát
```

Log tốt trông như sau (4 kết nối tới các data center gần nhất, ở Việt Nam thường là `sin`/`hkg`):

```
INF Starting tunnel tunnelID=...
INF Registered tunnel connection connIndex=0 connection=... location=sin02 protocol=quic
INF Registered tunnel connection connIndex=1 ... location=hkg01 protocol=quic
INF Registered tunnel connection connIndex=2 ...
INF Registered tunnel connection connIndex=3 ...
```

Trên dashboard (Networks → Tunnels), tunnel chuyển trạng thái **HEALTHY**, mục Connectors hiện tên máy bạn.

**Bước 4 — từ ngoài vào:** mở `https://test.<domain>`. Có HTTPS hợp lệ, không cảnh báo cert.

Những gì có thể gặp ở bước 3–4:

| Log / hiện tượng | Nghĩa là | Xử lý |
|---|---|---|
| `TUNNEL_TOKEN is required in tunnel mode` (ở **mọi** lệnh `docker compose`, kể cả bước 1) | `.env` thiếu token — compose kiểm tra biến của mọi service trước khi làm gì | Điền `TUNNEL_TOKEN=` |
| `Provided Tunnel token is not valid` | Token copy thiếu/thừa ký tự, có ngoặc kép hoặc dấu cách | Copy lại từ dashboard (tunnel → Configure → token) |
| Lặp lại `failed to dial to edge with quic` rồi mới `Registered` với `protocol=http2` | Mạng chặn UDP cổng 7844 (hay gặp ở mạng công ty); cloudflared đã **tự** chuyển sang HTTP/2 | Không cần làm gì. Muốn bỏ thời gian thử QUIC: thêm `TUNNEL_TRANSPORT_PROTOCOL: http2` vào `environment` của service cloudflared |
| Không có dòng `Registered` nào, toàn lỗi kết nối | Máy không ra được Cloudflare (proxy công ty, firewall) | Thử mạng khác (4G phát từ điện thoại) để khoanh vùng |
| Site báo **502**, log cloudflared có `dial tcp: lookup caddy` | cloudflared không cùng mạng với Caddy (chạy bằng lệnh của dashboard thay vì compose?) | `docker ps` xem có container cloudflared lạ nào → xoá nó; chỉ dùng service trong compose |
| Site báo **502**, log có `connection refused` | Caddy chưa chạy | `docker compose ps`, quay lại bước 1–2 |
| Site báo **1033** | Không có connector nào đang kết nối | `docker compose ps cloudflared`; xem log |

**Hai điều nên biết về token:**

- **Cùng một token chạy ở hai nơi = hai "replica"** của cùng tunnel, Cloudflare chia traffic cho cả hai. Đây là tính năng (chạy dự phòng), nhưng nếu vô tình để cloudflared chạy cả trên laptop lẫn máy khác thì một nửa request sẽ đi sang máy kia. Dashboard → tunnel → Connectors liệt kê mọi nơi đang dùng token.
- **Đổi token** (nghi bị lộ): dashboard → tunnel → refresh/rotate token → sửa `TUNNEL_TOKEN` trong `.env` → `docker compose up -d cloudflared` (compose thấy env đổi sẽ tạo lại container).

### 4.4. Tự kiểm tra

Các kiểm tra sau xác nhận stack hoạt động đúng thiết kế (và nên hiểu vì sao mỗi kết quả là đúng):

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
