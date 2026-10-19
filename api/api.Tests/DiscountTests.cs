using api.Services.Discounts;

namespace api.Tests;

public class DiscountTests
{
    private readonly DiscountResolver _resolver = new();

    [Fact]
    public void MotNhom_KhongGiam()
    {
        Assert.Equal(0m, _resolver.TinhGiamGia(1_000_000m, 1));
        Assert.IsType<KhongUuDai>(_resolver.Resolve(1));
    }

    [Fact]
    public void HaiNhom_Giam5PhanTram()
    {
        Assert.Equal(50_000m, _resolver.TinhGiamGia(1_000_000m, 2));
        Assert.IsType<UuDai2Nhom>(_resolver.Resolve(2));
    }

    [Fact]
    public void BaNhom_Giam10PhanTram_TheoViDuDeThi()
    {
        // Ví dụ đề: 4.700.000đ, 3 nhóm -> giảm 10% = 470.000đ.
        Assert.Equal(470_000m, _resolver.TinhGiamGia(4_700_000m, 3));
        Assert.IsType<UuDai3NhomTroLen>(_resolver.Resolve(3));
    }
}
