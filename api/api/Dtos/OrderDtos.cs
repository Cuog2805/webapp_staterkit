using System.ComponentModel.DataAnnotations;

namespace api.Dtos;

/// <summary>Một dòng trong đơn khi tạo.</summary>
public record OrderLineInput(
    [Required] long GiaiPhapId,
    [Required, Range(1, 100)] int SoLuong);

/// <summary>Tạo đơn (KHACH_HANG). ngayHen dạng yyyy-MM-dd.</summary>
public record CreateOrderRequest(
    [Required, MinLength(1)] List<OrderLineInput> Dong,
    [Required] string DiaChi,
    [Required] DateOnly NgayHen);

/// <summary>Chuyển trạng thái đơn.</summary>
public record TransitionRequest(
    [Required] string DenTrangThai,
    long? KtvId,
    string? LyDo,
    [Required] int Version);

public record OrderItemDto(long GiaiPhapId, string Ten, string Nhom, decimal DonGia, int SoLuong, decimal ThanhTien);

public record OrderHistoryDto(string? TuTrangThai, string DenTrangThai, long? NguoiThucHienId, string? LyDo, DateTime ThoiGian);

/// <summary>Phần tử danh sách đơn.</summary>
public record OrderListItemDto(
    long Id, string MaDon, string TrangThai, string DiaChi, DateOnly NgayHen,
    decimal TongTien, decimal GiamGia, decimal ThanhToan,
    long KhachHangId, long? KtvId, int Version, DateTime NgayTao);

/// <summary>Chi tiết đơn kèm dòng và lịch sử.</summary>
public record OrderDetailDto(
    long Id, string MaDon, string TrangThai, string DiaChi, DateOnly NgayHen,
    decimal TongTien, decimal GiamGia, decimal ThanhToan,
    long KhachHangId, string? KhachHangTen, long? KtvId, string? KtvTen,
    int Version, DateTime NgayTao,
    IReadOnlyList<OrderItemDto> Dong,
    IReadOnlyList<OrderHistoryDto> LichSu);
