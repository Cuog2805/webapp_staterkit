# Build context: thư mục api/ (xem deploy/docker-compose.local.yml).

# ---- Stage 1: build ----
# SDK image (~800MB) chỉ dùng để build; không đi vào image cuối.
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy riêng .csproj rồi restore trước: layer restore được cache, chỉ chạy lại khi
# dependency đổi chứ không phải mỗi lần sửa code.
COPY api/api.csproj api/
RUN dotnet restore api/api.csproj

COPY api/ api/
RUN dotnet publish api/api.csproj -c Release -o /app --no-restore /p:UseAppHost=false

# ---- Stage 2: runtime ----
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime

# curl chỉ để phục vụ HEALTHCHECK bên dưới.
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=build /app .

# Image .NET 8+ có sẵn user không-root "app" (UID trong $APP_UID). Không chạy bằng root.
USER $APP_UID
ENV ASPNETCORE_HTTP_PORTS=8080
EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=3s --start-period=20s --retries=3 \
    CMD curl -fsS http://127.0.0.1:8080/health || exit 1

ENTRYPOINT ["dotnet", "api.dll"]
