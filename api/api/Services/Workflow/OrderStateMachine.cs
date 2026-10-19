using api.Models;

namespace api.Services.Workflow;

/// <summary>Dữ liệu đầu vào thuần (đã được service phân giải từ DB) để quyết định chuyển trạng thái.</summary>
public sealed record TransitionInput(
    string From,
    string To,
    string ActorRole,
    bool ActorIsOwner,
    bool ActorIsAssignedKtv,
    string? LyDo,
    bool KtvProvidedAndValid);

/// <summary>Kết quả quyết định: Ok hoặc mã lỗi HTTP + code + message.</summary>
public sealed record TransitionResult(bool Ok, int HttpStatus = 200, string Code = "", string Message = "")
{
    public static readonly TransitionResult Success = new(true);
    public static TransitionResult Fail(int status, string code, string message) => new(false, status, code, message);
}

/// <summary>
/// State pattern (B3): toàn bộ vòng đời đơn khai báo trong MỘT bảng chuyển trạng thái tập trung.
/// Không rải if/else theo trạng thái ở service — service chỉ phân giải dữ kiện (chủ đơn, KTV được
/// giao, KTV hợp lệ) rồi hỏi state machine. Chuyển không có trong bảng → 422; sai người → 403.
/// </summary>
public static class OrderStateMachine
{
    /// <summary>Một cạnh chuyển trạng thái và các điều kiện kèm theo.</summary>
    public sealed record TransitionRule(
        string From,
        string To,
        string[] AllowedRoles,
        bool RequiresReason = false,
        bool RequiresKtv = false,
        bool OwnerOnlyForCustomer = false,
        bool AssignedKtvOnly = false);

    /// <summary>Bảng chuyển trạng thái (theo mục II của đề).</summary>
    public static readonly IReadOnlyList<TransitionRule> Rules =
    [
        new(TrangThaiDon.Moi,           TrangThaiDon.DaTiepNhan,    [VaiTro.DieuHanh]),
        new(TrangThaiDon.Moi,           TrangThaiDon.Huy,           [VaiTro.KhachHang, VaiTro.DieuHanh], RequiresReason: true, OwnerOnlyForCustomer: true),
        new(TrangThaiDon.DaTiepNhan,    TrangThaiDon.DangTrienKhai, [VaiTro.DieuHanh], RequiresKtv: true),
        new(TrangThaiDon.DaTiepNhan,    TrangThaiDon.Huy,           [VaiTro.DieuHanh], RequiresReason: true),
        new(TrangThaiDon.DangTrienKhai, TrangThaiDon.HoanTat,       [VaiTro.KyThuat], AssignedKtvOnly: true),
    ];

    public static TransitionRule? FindRule(string from, string to) =>
        Rules.FirstOrDefault(r => r.From == from && r.To == to);

    /// <summary>Kiểm tra một lần chuyển trạng thái. Trả kết quả Ok/lỗi thay vì ném để dễ test.</summary>
    public static TransitionResult Validate(TransitionInput input)
    {
        var rule = FindRule(input.From, input.To);
        if (rule is null)
        {
            return TransitionResult.Fail(422, "INVALID_TRANSITION",
                $"Không thể chuyển từ '{input.From}' sang '{input.To}'.");
        }

        if (!rule.AllowedRoles.Contains(input.ActorRole))
        {
            return TransitionResult.Fail(403, "FORBIDDEN_ROLE",
                "Vai trò của bạn không được phép thực hiện chuyển trạng thái này.");
        }

        if (rule.OwnerOnlyForCustomer && input.ActorRole == VaiTro.KhachHang && !input.ActorIsOwner)
        {
            return TransitionResult.Fail(403, "FORBIDDEN_NOT_OWNER", "Bạn chỉ thao tác được đơn của mình.");
        }

        if (rule.AssignedKtvOnly && input.ActorRole == VaiTro.KyThuat && !input.ActorIsAssignedKtv)
        {
            return TransitionResult.Fail(403, "FORBIDDEN_NOT_ASSIGNED", "Bạn chỉ thao tác được đơn được giao cho mình.");
        }

        if (rule.RequiresReason && string.IsNullOrWhiteSpace(input.LyDo))
        {
            return TransitionResult.Fail(422, "REASON_REQUIRED", "Cần ghi lý do cho thao tác này.");
        }

        if (rule.RequiresKtv && !input.KtvProvidedAndValid)
        {
            return TransitionResult.Fail(422, "KTV_REQUIRED", "Cần phân công kỹ thuật viên (ktvId) hợp lệ.");
        }

        return TransitionResult.Success;
    }
}
