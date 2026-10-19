using api.Data;
using api.Dtos;
using api.Infrastructure;
using api.Models;
using api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace api.Controllers;

[ApiController]
[Route("api/orders")]
[Authorize]
public class OrdersController(AppDbContext db, OrderService orderService, OrderTransitionService transitionService)
    : ControllerBase
{
    /// <summary>Tạo đơn (KHACH_HANG). Hỗ trợ header Idempotency-Key (B4).</summary>
    [HttpPost]
    [Authorize(Roles = VaiTro.KhachHang)]
    public async Task<ActionResult<OrderDetailDto>> Create(CreateOrderRequest request)
    {
        var userId = User.GetUserId() ?? throw ApiException.Unauthorized("Token không hợp lệ.");
        var idempotencyKey = Request.Headers["Idempotency-Key"].FirstOrDefault();

        var order = await orderService.CreateAsync(userId, request, idempotencyKey);
        var detail = await LoadDetailAsync(order.Id);
        return CreatedAtAction(nameof(GetById), new { id = order.Id }, detail);
    }

    /// <summary>Danh sách đơn. Khách: của mình; nhân viên (DIEU_HANH/KY_THUAT): tất cả.</summary>
    [HttpGet]
    public async Task<ActionResult<PagedResult<OrderListItemDto>>> List(
        [FromQuery] string? trangThai = null, [FromQuery] int page = 1, [FromQuery] int size = 20)
    {
        var userId = User.GetUserId() ?? throw ApiException.Unauthorized("Token không hợp lệ.");
        var role = User.GetRole();

        page = page < 1 ? 1 : page;
        size = size < 1 ? 20 : size > 50 ? 50 : size; // trần size = 50 theo đặc tả

        var query = db.Orders.AsQueryable();
        if (role == VaiTro.KhachHang)
        {
            query = query.Where(o => o.KhachHangId == userId);
        }
        if (!string.IsNullOrWhiteSpace(trangThai))
        {
            query = query.Where(o => o.TrangThai == trangThai);
        }

        var total = await query.LongCountAsync();
        var items = await query
            .OrderByDescending(o => o.Id)
            .Skip((page - 1) * size)
            .Take(size)
            .Select(o => new OrderListItemDto(
                o.Id, o.MaDon, o.TrangThai, o.DiaChi, o.NgayHen,
                o.TongTien, o.GiamGia, o.ThanhToan,
                o.KhachHangId, o.KtvId, o.Version, o.CreatedAt))
            .ToListAsync();

        return Ok(new PagedResult<OrderListItemDto>(items, total, page, size));
    }

    /// <summary>Chi tiết đơn kèm lịch sử. Chủ đơn / nhân viên; sai quyền → 404.</summary>
    [HttpGet("{id:long}")]
    public async Task<ActionResult<OrderDetailDto>> GetById(long id)
    {
        var userId = User.GetUserId() ?? throw ApiException.Unauthorized("Token không hợp lệ.");
        var role = User.GetRole();

        var order = await db.Orders.AsNoTracking().FirstOrDefaultAsync(o => o.Id == id);
        // Không tồn tại, hoặc khách xem đơn người khác → 404 (không lộ tồn tại).
        if (order is null || (role == VaiTro.KhachHang && order.KhachHangId != userId))
        {
            throw ApiException.NotFound("Không tìm thấy đơn.");
        }

        return Ok(await LoadDetailAsync(id));
    }

    /// <summary>Chuyển trạng thái đơn theo bảng (vai trò/điều kiện/version).</summary>
    [HttpPost("{id:long}/transitions")]
    public async Task<ActionResult<OrderDetailDto>> Transition(long id, TransitionRequest request)
    {
        var userId = User.GetUserId() ?? throw ApiException.Unauthorized("Token không hợp lệ.");
        var role = User.GetRole() ?? throw ApiException.Unauthorized("Token không hợp lệ.");

        await transitionService.TransitionAsync(id, userId, role, request);
        return Ok(await LoadDetailAsync(id));
    }

    private async Task<OrderDetailDto> LoadDetailAsync(long id)
    {
        var order = await db.Orders
            .AsNoTracking()
            .Include(o => o.KhachHang)
            .Include(o => o.Ktv)
            .Include(o => o.Items).ThenInclude(i => i.GiaiPhap)
            .Include(o => o.History)
            .FirstAsync(o => o.Id == id);

        var dong = order.Items.Select(i => new OrderItemDto(
            i.GiaiPhapId, i.GiaiPhap?.Ten ?? string.Empty, i.Nhom, i.DonGia, i.SoLuong, i.ThanhTien)).ToList();

        var lichSu = order.History
            .OrderBy(h => h.CreatedAt).ThenBy(h => h.Id)
            .Select(h => new OrderHistoryDto(h.TuTrangThai, h.DenTrangThai, h.NguoiThucHienId, h.LyDo, h.CreatedAt))
            .ToList();

        return new OrderDetailDto(
            order.Id, order.MaDon, order.TrangThai, order.DiaChi, order.NgayHen,
            order.TongTien, order.GiamGia, order.ThanhToan,
            order.KhachHangId, order.KhachHang?.HoTen, order.KtvId, order.Ktv?.HoTen,
            order.Version, order.CreatedAt, dong, lichSu);
    }
}
