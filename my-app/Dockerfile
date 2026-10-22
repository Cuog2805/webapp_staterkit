# Build context: thư mục my-app/.

# ---- Stage 1: cài dependency (cache riêng theo package-lock.json) ----
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# ---- Stage 2: build ----
FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* được nhúng cứng vào JS lúc build, KHÔNG đọc lúc chạy.
# Để rỗng ⇒ client gọi đường dẫn tương đối "/api/..." cùng domain, reverse proxy chuyển
# sang API. Nhờ vậy cùng một image chạy được ở mọi môi trường (staging, prod...).
ARG NEXT_PUBLIC_API_URL=""
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- Stage 3: runtime (chỉ output standalone, không có node_modules đầy đủ) ----
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static

USER node
EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=3s --start-period=20s --retries=3 \
    CMD wget -qO /dev/null http://127.0.0.1:3000/ || exit 1

CMD ["node", "server.js"]
