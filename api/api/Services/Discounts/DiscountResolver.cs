namespace api.Services.Discounts;

/// <summary>
/// Chọn chiến lược ưu đãi phù hợp theo số nhóm giải pháp khác nhau trong đơn,
/// và tính số tiền giảm. Tập hợp các chiến lược ở một nơi (Strategy pattern).
/// </summary>
public sealed class DiscountResolver
{
    private readonly IReadOnlyList<IDiscountStrategy> _strategies;

    public DiscountResolver()
        : this([new UuDai3NhomTroLen(), new UuDai2Nhom(), new KhongUuDai()])
    {
    }

    public DiscountResolver(IReadOnlyList<IDiscountStrategy> strategies) => _strategies = strategies;

    /// <summary>Chiến lược áp dụng cho số nhóm khác nhau cho trước.</summary>
    public IDiscountStrategy Resolve(int soNhomKhacNhau) =>
        _strategies.FirstOrDefault(s => s.ApDungCho(soNhomKhacNhau)) ?? new KhongUuDai();

    /// <summary>Số tiền được giảm cho tổng tiền và số nhóm khác nhau.</summary>
    public decimal TinhGiamGia(decimal tongTien, int soNhomKhacNhau) =>
        Resolve(soNhomKhacNhau).TinhGiamGia(tongTien);
}
