namespace api.Dtos;

public record StatusCountDto(string TrangThai, long SoLuong);

public record RevenueByGroupDto(string Nhom, decimal DoanhThu);

/// <summary>Báo cáo tổng hợp (B1).</summary>
public record ReportSummaryDto(
    IReadOnlyList<StatusCountDto> SoDonTheoTrangThai,
    IReadOnlyList<RevenueByGroupDto> DoanhThuTheoNhom,
    decimal TyLeHuy,
    long TongSoDon);
