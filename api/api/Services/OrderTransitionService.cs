using api.Data;
using api.Dtos;
using api.Infrastructure;
using api.Models;
using api.Services.Workflow;
using Microsoft.EntityFrameworkCore;

namespace api.Services;

public class OrderTransitionService(AppDbContext db)
{
    /// <summary>
    /// Chuyển trạng thái đơn theo bảng tập trung (OrderStateMachine). Kiểm tra vai trò/điều kiện,
    /// khóa lạc quan theo version (B4), và ghi lịch sử.
    /// </summary>
    public async Task<Order> TransitionAsync(long orderId, long actorId, string actorRole, TransitionRequest req)
    {
        var order = await db.Orders.FirstOrDefaultAsync(o => o.Id == orderId)
            ?? throw ApiException.NotFound("Không tìm thấy đơn.");

        // Khóa lạc quan: version gửi lên phải khớp version hiện tại (B4).
        if (req.Version != order.Version)
        {
            throw ApiException.Conflict(
                "Đơn đã được người khác cập nhật. Vui lòng tải lại và thử lại.", "VERSION_CONFLICT");
        }

        // Phân giải dữ kiện phụ thuộc DB rồi để state machine quyết định.
        var ktvHopLe = false;
        if (req.KtvId is { } ktvId)
        {
            ktvHopLe = await db.Users.AnyAsync(u => u.Id == ktvId && u.VaiTro == VaiTro.KyThuat);
        }

        var input = new TransitionInput(
            From: order.TrangThai,
            To: req.DenTrangThai,
            ActorRole: actorRole,
            ActorIsOwner: order.KhachHangId == actorId,
            ActorIsAssignedKtv: order.KtvId == actorId,
            LyDo: req.LyDo,
            KtvProvidedAndValid: ktvHopLe);

        var result = OrderStateMachine.Validate(input);
        if (!result.Ok)
        {
            throw new ApiException(result.HttpStatus, result.Code, result.Message);
        }

        var tu = order.TrangThai;
        order.TrangThai = req.DenTrangThai;

        // Chuyển DA_TIEP_NHAN -> DANG_TRIEN_KHAI: gán kỹ thuật viên được phân công.
        var rule = OrderStateMachine.FindRule(tu, req.DenTrangThai)!;
        if (rule.RequiresKtv)
        {
            order.KtvId = req.KtvId;
        }

        order.Version += 1;
        order.History.Add(new OrderStatusHistory
        {
            TuTrangThai = tu,
            DenTrangThai = req.DenTrangThai,
            NguoiThucHienId = actorId,
            LyDo = string.IsNullOrWhiteSpace(req.LyDo) ? null : req.LyDo,
            CreatedAt = DateTime.Now,
        });

        await db.SaveChangesAsync();
        return order;
    }
}
