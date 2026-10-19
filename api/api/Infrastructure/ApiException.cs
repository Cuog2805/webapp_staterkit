namespace api.Infrastructure;

/// <summary>
/// Lỗi nghiệp vụ mang sẵn mã HTTP + code. ExceptionHandlingMiddleware sẽ dịch ra
/// body chuẩn { "error": { "code", "message" } }.
/// </summary>
public sealed class ApiException(int statusCode, string code, string message) : Exception(message)
{
    public int StatusCode { get; } = statusCode;
    public string Code { get; } = code;

    public static ApiException BadRequest(string message, string code = "BAD_REQUEST") => new(400, code, message);
    public static ApiException Unauthorized(string message, string code = "UNAUTHORIZED") => new(401, code, message);
    public static ApiException Forbidden(string message, string code = "FORBIDDEN") => new(403, code, message);
    public static ApiException NotFound(string message, string code = "NOT_FOUND") => new(404, code, message);
    public static ApiException Conflict(string message, string code = "CONFLICT") => new(409, code, message);
    public static ApiException Unprocessable(string message, string code = "UNPROCESSABLE") => new(422, code, message);
}
