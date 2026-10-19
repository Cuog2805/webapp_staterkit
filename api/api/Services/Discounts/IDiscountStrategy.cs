namespace api.Services.Discounts;

/// <summary>
/// Strategy (B3): mỗi chương trình ưu đãi là một chiến lược riêng. Việc chọn chương trình
/// nào dựa trên số nhóm giải pháp khác nhau trong đơn — không rải if/else trong service.
/// </summary>
public interface IDiscountStrategy
{
    /// <summary>Tên chương trình (hiển thị / ghi log).</summary>
    string Ten { get; }

    /// <summary>Phần trăm giảm (0, 5, 10...).</summary>
    decimal PhanTram { get; }

    /// <summary>Chiến lược này áp dụng cho đơn có bao nhiêu nhóm khác nhau?</summary>
    bool ApDungCho(int soNhomKhacNhau);

    /// <summary>Số tiền giảm trên tổng tiền (làm tròn 2 chữ số).</summary>
    decimal TinhGiamGia(decimal tongTien) => Math.Round(tongTien * PhanTram / 100m, 2, MidpointRounding.AwayFromZero);
}
