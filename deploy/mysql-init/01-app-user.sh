#!/bin/bash
# Chạy MỘT LẦN khi MySQL khởi tạo volume trống (cơ chế /docker-entrypoint-initdb.d).
# Tạo user cho API với quyền tối thiểu: chỉ đọc/ghi dữ liệu, không CREATE/ALTER/DROP.
# Nếu API bị khai thác SQL injection, kẻ tấn công cũng không xóa được bảng.
#
# Đổi mật khẩu sau này: script này KHÔNG chạy lại — dùng ALTER USER thủ công.
set -euo pipefail

mysql --protocol=socket -uroot -p"${MYSQL_ROOT_PASSWORD}" <<SQL
CREATE USER IF NOT EXISTS '${APP_DB_USER}'@'%' IDENTIFIED BY '${APP_DB_PASSWORD}';
GRANT SELECT, INSERT, UPDATE, DELETE ON \`${MYSQL_DATABASE}\`.* TO '${APP_DB_USER}'@'%';
SQL
