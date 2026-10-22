#!/usr/bin/env bash
# Deploy (hoặc rollback) sang một tag image. Chạy TRÊN SERVER, trong thư mục deploy.
#
#   scripts/deploy.sh <tag>        # vd: scripts/deploy.sh sha-1a2b3c4
#   scripts/deploy.sh --rollback   # quay về tag trước đó trong .deploy-history
#
# Rollback chỉ lùi CODE. Migration DB chỉ đi tiến — nên mọi migration phải tương thích ngược
# với bản code trước đó (xem docs/deploy.md, mục "Migration an toàn").
set -euo pipefail
cd "$(dirname "$0")/.."

[[ -f .env ]] || { echo "Thiếu .env (cp .env.example .env)" >&2; exit 1; }

current_tag=$(grep -E '^TAG=' .env | cut -d= -f2- || true)

if [[ "${1:-}" == "--rollback" ]]; then
  [[ -s .deploy-history ]] || { echo "Chưa có lịch sử deploy để rollback" >&2; exit 1; }
  tag=$(tail -n 1 .deploy-history)
  sed -i '$ d' .deploy-history
  record_history=false
elif [[ -n "${1:-}" ]]; then
  tag=$1
  record_history=true
else
  echo "Cách dùng: $0 <tag> | --rollback" >&2
  exit 1
fi

echo "==> Deploy tag: $tag (đang chạy: ${current_tag:-<chưa có>})"

# Kéo image TRƯỚC khi đổi gì: nếu tag sai/không tồn tại thì dừng ở đây, stack cũ vẫn chạy.
TAG="$tag" docker compose pull --quiet

if grep -qE '^TAG=' .env; then
  sed -i "s|^TAG=.*|TAG=${tag}|" .env
else
  echo "TAG=${tag}" >> .env
fi
if [[ "$record_history" == true && -n "$current_tag" && "$current_tag" != "$tag" ]]; then
  echo "$current_tag" >> .deploy-history
fi

# --wait: chỉ trả về khi mọi service healthy (hoặc báo lỗi) ⇒ CI biết deploy có thành công thật không.
docker compose up -d --remove-orphans --wait --wait-timeout 180

docker image prune -f > /dev/null
echo "==> Xong. Đang chạy tag: $tag"
docker compose ps
