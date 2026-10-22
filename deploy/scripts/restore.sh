#!/usr/bin/env bash
# Khôi phục database từ file backup. GHI ĐÈ dữ liệu hiện tại.
#   scripts/restore.sh /var/backups/webapp/db-20260101T021500Z.sql.gz
#
# Tập restore định kỳ (vào một stack thử nghiệm): backup chưa từng restore thử thì chưa
# thể tin là dùng được.
set -euo pipefail
cd "$(dirname "$0")/.."

file=${1:?Cách dùng: $0 <file.sql.gz>}
[[ -f "$file" ]] || { echo "Không thấy file: $file" >&2; exit 1; }

read -r -p "Ghi đè database hiện tại bằng $file? Gõ 'yes' để tiếp tục: " answer
[[ "$answer" == "yes" ]] || { echo "Đã hủy."; exit 1; }

# Dừng API để không có ghi mới trong lúc restore.
docker compose stop api

gunzip -c "$file" | docker compose exec -T mysql sh -c \
  'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysql -uroot "$MYSQL_DATABASE"'

docker compose start api
echo "Restore xong từ $file"
