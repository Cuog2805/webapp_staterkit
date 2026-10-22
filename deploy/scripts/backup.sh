#!/usr/bin/env bash
# Dump database ra file .sql.gz, giữ lại BACKUP_KEEP_DAYS ngày. Chạy trên server, vd bằng cron:
#   15 2 * * * /opt/webapp/scripts/backup.sh >> /var/log/webapp-backup.log 2>&1
#
# Backup nằm cùng ổ đĩa với DB thì chưa phải backup: server hỏng là mất cả hai.
# Đồng bộ BACKUP_DIR ra nơi khác (object storage, máy khác) — xem docs/deploy.md.
set -euo pipefail
cd "$(dirname "$0")/.."

BACKUP_DIR=${BACKUP_DIR:-/var/backups/webapp}
BACKUP_KEEP_DAYS=${BACKUP_KEEP_DAYS:-14}
mkdir -p "$BACKUP_DIR"

file="$BACKUP_DIR/db-$(date -u +%Y%m%dT%H%M%SZ).sql.gz"

# Đọc mật khẩu từ biến môi trường BÊN TRONG container, không source .env ở host
# (tránh lỗi khi mật khẩu chứa ký tự đặc biệt và không lộ mật khẩu ra dòng lệnh).
# --single-transaction: snapshot nhất quán của InnoDB mà không khóa bảng.
docker compose exec -T mysql sh -c \
  'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysqldump -uroot --single-transaction --routines --triggers --set-gtid-purged=OFF "$MYSQL_DATABASE"' \
  | gzip > "$file.partial"

# Ghi ra .partial rồi mới đổi tên: file .sql.gz luôn là bản hoàn chỉnh.
mv "$file.partial" "$file"
find "$BACKUP_DIR" -name 'db-*.sql.gz' -mtime +"$BACKUP_KEEP_DAYS" -delete

echo "Backup OK: $file ($(du -h "$file" | cut -f1))"
