namespace api.Infrastructure;

/// <summary>Body lỗi chuẩn theo đặc tả: { "error": { "code", "message" } }.</summary>
public sealed record ErrorBody(string Code, string Message);

public sealed record ErrorResponse(ErrorBody Error)
{
    public static ErrorResponse Of(string code, string message) => new(new ErrorBody(code, message));
}
