using Microsoft.EntityFrameworkCore;

namespace api.Infrastructure;

/// <summary>
/// Bắt mọi exception và trả body chuẩn { error: { code, message } } với đúng HTTP status.
/// ApiException → status kèm theo; DbUpdateConcurrencyException → 409 (optimistic lock);
/// còn lại → 500.
/// </summary>
public sealed class ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (ApiException ex)
        {
            await WriteError(context, ex.StatusCode, ex.Code, ex.Message);
        }
        catch (DbUpdateConcurrencyException)
        {
            await WriteError(context, 409, "VERSION_CONFLICT",
                "Đơn đã được người khác cập nhật. Vui lòng tải lại và thử lại.");
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unhandled exception");
            await WriteError(context, 500, "INTERNAL_ERROR", "Đã xảy ra lỗi không mong muốn.");
        }
    }

    private static Task WriteError(HttpContext context, int status, string code, string message)
    {
        context.Response.StatusCode = status;
        context.Response.ContentType = "application/json";
        return context.Response.WriteAsJsonAsync(ErrorResponse.Of(code, message));
    }
}
