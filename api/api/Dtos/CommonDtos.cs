namespace api.Dtos;

/// <summary>Kết quả phân trang chuẩn cho mọi danh sách.</summary>
public record PagedResult<T>(IReadOnlyList<T> Items, long Total, int Page, int Size);
