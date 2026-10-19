namespace api.Models;

/// <summary>Vai trò người dùng.</summary>
public static class VaiTro
{
    public const string KhachHang = "KHACH_HANG";
    public const string DieuHanh = "DIEU_HANH";
    public const string KyThuat = "KY_THUAT";
}

/// <summary>Nhóm giải pháp CNTT.</summary>
public static class NhomGiaiPhap
{
    public const string ChuKySo = "CHU_KY_SO";
    public const string HoaDonDt = "HOA_DON_DT";
    public const string CameraAi = "CAMERA_AI";
    public const string Cloud = "CLOUD";
    public const string PhanMem = "PHAN_MEM";

    public static readonly string[] All = [ChuKySo, HoaDonDt, CameraAi, Cloud, PhanMem];
}

/// <summary>Trạng thái vòng đời đơn.</summary>
public static class TrangThaiDon
{
    public const string Moi = "MOI";
    public const string DaTiepNhan = "DA_TIEP_NHAN";
    public const string DangTrienKhai = "DANG_TRIEN_KHAI";
    public const string HoanTat = "HOAN_TAT";
    public const string Huy = "HUY";

    public static readonly string[] All = [Moi, DaTiepNhan, DangTrienKhai, HoanTat, Huy];
}
