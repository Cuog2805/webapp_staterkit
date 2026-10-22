using System.Text;
using api.Data;
using api.Infrastructure;
using api.OpenApi;
using api.Services;
using api.Services.Discounts;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddControllers();

// Lỗi validation (400) cũng trả đúng shape { error: { code, message } }.
builder.Services.Configure<ApiBehaviorOptions>(options =>
{
    options.InvalidModelStateResponseFactory = ctx =>
    {
        var msg = string.Join("; ", ctx.ModelState.Values
            .SelectMany(v => v.Errors)
            .Select(e => e.ErrorMessage)
            .Where(m => !string.IsNullOrWhiteSpace(m)));
        if (string.IsNullOrWhiteSpace(msg)) msg = "Dữ liệu không hợp lệ.";
        return new BadRequestObjectResult(ErrorResponse.Of("VALIDATION_ERROR", msg));
    };
});
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi(options =>
    options.AddDocumentTransformer<JwtBearerSecuritySchemeTransformer>());

var connectionString = builder.Configuration.GetConnectionString("Default")
    ?? throw new InvalidOperationException("Connection string 'Default' is missing.");

// Ghi cứng phiên bản MySQL thay vì ServerVersion.AutoDetect: AutoDetect mở kết nối DB
// ngay lúc khởi động, nên API sẽ crash nếu MySQL chưa sẵn sàng. Giữ khớp với image mysql:8.4.
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseMySql(connectionString, new MySqlServerVersion(new Version(8, 4, 0))));

builder.Services.AddScoped<TokenService>();
builder.Services.AddSingleton<DiscountResolver>();
builder.Services.AddScoped<OrderService>();
builder.Services.AddScoped<OrderTransitionService>();
builder.Services.AddScoped<ReportService>();

var jwt = builder.Configuration.GetSection("Jwt").Get<JwtOptions>()
    ?? throw new InvalidOperationException("Jwt configuration section is missing.");

// Fail fast: HMAC-SHA256 cần key >= 256 bit. Thà không khởi động còn hơn chạy với key yếu/rỗng.
if (Encoding.UTF8.GetByteCount(jwt.Key) < 32)
    throw new InvalidOperationException("Jwt:Key must be at least 32 bytes.");

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwt.Issuer,
            ValidAudience = jwt.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.Key)),
        };

        // Trả lỗi 401/403 theo shape chuẩn { error: { code, message } }.
        options.Events = new JwtBearerEvents
        {
            OnChallenge = async context =>
            {
                context.HandleResponse();
                context.Response.StatusCode = 401;
                context.Response.ContentType = "application/json";
                await context.Response.WriteAsJsonAsync(
                    ErrorResponse.Of("UNAUTHORIZED", "Bạn cần đăng nhập để thực hiện thao tác này."));
            },
            OnForbidden = async context =>
            {
                context.Response.StatusCode = 403;
                context.Response.ContentType = "application/json";
                await context.Response.WriteAsJsonAsync(
                    ErrorResponse.Of("FORBIDDEN", "Bạn không có quyền thực hiện thao tác này."));
            },
        };
    });

builder.Services.AddAuthorization();

// Production chạy frontend và API cùng domain (reverse proxy định tuyến /api) nên không cần
// CORS; danh sách origin để trống. Dev (khác cổng) cấu hình trong appsettings.Development.json.
const string CorsPolicy = "frontend";
var corsOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
builder.Services.AddCors(options =>
    options.AddPolicy(CorsPolicy, policy =>
        policy.WithOrigins(corsOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()));

// Sau reverse proxy, IP client và scheme thật nằm trong header X-Forwarded-*.
// Tin mọi proxy là chấp nhận được vì API chỉ nhận traffic trong mạng Docker nội bộ
// (không publish cổng ra ngoài). Nếu API bị lộ trực tiếp ra Internet thì phải khai báo KnownProxies.
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownIPNetworks.Clear();
    options.KnownProxies.Clear();
});

// Liveness check: chỉ trả lời "process còn sống", cố ý KHÔNG kiểm tra DB — nếu DB chậm mà
// healthcheck fail thì orchestrator restart API vô ích, gây restart dây chuyền.
builder.Services.AddHealthChecks();

var app = builder.Build();

app.UseForwardedHeaders();

// Bắt mọi lỗi và trả body chuẩn { error: { code, message } } — đặt đầu pipeline.
app.UseMiddleware<ExceptionHandlingMiddleware>();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    // Swagger UI served at /swagger, backed by the OpenAPI document above.
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/openapi/v1.json", "api v1");
        options.RoutePrefix = "swagger";
    });
}
// Không dùng UseHttpsRedirection: TLS được terminate ở reverse proxy (Caddy), proxy lo
// redirect HTTP→HTTPS và HSTS. API trong container chỉ nghe HTTP nội bộ.

app.UseCors(CorsPolicy);

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHealthChecks("/health");

app.Run();
