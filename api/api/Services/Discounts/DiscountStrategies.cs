namespace api.Services.Discounts;

/// <summary>Không ưu đãi: đơn chỉ có 1 nhóm giải pháp.</summary>
public sealed class KhongUuDai : IDiscountStrategy
{
    public string Ten => "Không ưu đãi";
    public decimal PhanTram => 0m;
    public bool ApDungCho(int soNhomKhacNhau) => soNhomKhacNhau <= 1;
}

/// <summary>Giảm 5%: đơn có đúng 2 nhóm giải pháp khác nhau.</summary>
public sealed class UuDai2Nhom : IDiscountStrategy
{
    public string Ten => "Ưu đãi 2 nhóm (giảm 5%)";
    public decimal PhanTram => 5m;
    public bool ApDungCho(int soNhomKhacNhau) => soNhomKhacNhau == 2;
}

/// <summary>Giảm 10%: đơn có từ 3 nhóm giải pháp khác nhau trở lên.</summary>
public sealed class UuDai3NhomTroLen : IDiscountStrategy
{
    public string Ten => "Ưu đãi từ 3 nhóm (giảm 10%)";
    public decimal PhanTram => 10m;
    public bool ApDungCho(int soNhomKhacNhau) => soNhomKhacNhau >= 3;
}
