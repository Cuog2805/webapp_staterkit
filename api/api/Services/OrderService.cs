using api.Data;
using api.Dtos;
using api.Infrastructure;
using api.Models;
using api.Services.Discounts;
using Microsoft.EntityFrameworkCore;

namespace api.Services;

public class OrderService(AppDbContext db, DiscountResolver discountResolver)
{
    private const int MaxDong = 5;

    /// <summary>Tạo đơn mới cho khách hàng. Hỗ trợ Idempotency-Key (B4).</summary>
    public async Task<Order> CreateAsync(long khachHangId, CreateOrderRequest req, string? idempotencyKey)
    {
        // B4 — chống tạo trùng: cùng Idempotency-Key trả lại đơn đã tạo, không tạo mới.
        if (!string.IsNullOrWhiteSpace(idempotencyKey))
        {
            var existing = await db.Orders
                .FirstOrDefaultAsync(o => o.IdempotencyKey == idempotencyKey && o.KhachHangId == khachHangId);
            if (existing is not null)
            {
                return existing;
            }
        }

        if (req.Dong.Count is < 1 or > MaxDong)
        {
            throw ApiException.Unprocessable($"Đơn phải có từ 1 đến {MaxDong} dòng.", "INVALID_LINES");
        }

        ValidateNgayHen(req.NgayHen);

        // Snapshot đơn giá & nhóm từ danh mục tại thời điểm đặt.
        var ids = req.Dong.Select(d => d.GiaiPhapId).Distinct().ToList();
        var solutions = await db.Solutions.Where(s => ids.Contains(s.Id)).ToDictionaryAsync(s => s.Id);

        var items = new List<OrderItem>();
        decimal tongTien = 0;
        foreach (var line in req.Dong)
        {
            if (line.SoLuong is < 1 or > 100)
            {
                throw ApiException.Unprocessable("Số lượng mỗi dòng phải từ 1 đến 100.", "INVALID_QUANTITY");
            }
            if (!solutions.TryGetValue(line.GiaiPhapId, out var sol))
            {
                throw ApiException.Unprocessable($"Giải pháp {line.GiaiPhapId} không tồn tại.", "SOLUTION_NOT_FOUND");
            }

            var thanhTien = sol.DonGia * line.SoLuong;
            tongTien += thanhTien;
            items.Add(new OrderItem
            {
                GiaiPhapId = sol.Id,
                Nhom = sol.Nhom,
                DonGia = sol.DonGia,
                SoLuong = line.SoLuong,
                ThanhTien = thanhTien,
            });
        }

        // Ưu đãi theo số nhóm giải pháp khác nhau (Strategy).
        var soNhom = items.Select(i => i.Nhom).Distinct().Count();
        var giamGia = discountResolver.TinhGiamGia(tongTien, soNhom);

        var now = DateTime.Now;
        var order = new Order
        {
            MaDon = await GenerateMaDonAsync(now),
            KhachHangId = khachHangId,
            DiaChi = req.DiaChi,
            NgayHen = req.NgayHen,
            TrangThai = TrangThaiDon.Moi,
            TongTien = tongTien,
            GiamGia = giamGia,
            ThanhToan = tongTien - giamGia,
            Version = 0,
            IdempotencyKey = string.IsNullOrWhiteSpace(idempotencyKey) ? null : idempotencyKey,
            Items = items,
            History =
            [
                new OrderStatusHistory
                {
                    TuTrangThai = null,
                    DenTrangThai = TrangThaiDon.Moi,
                    NguoiThucHienId = khachHangId,
                    CreatedAt = now,
                },
            ],
        };

        db.Orders.Add(order);
        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException) when (!string.IsNullOrWhiteSpace(idempotencyKey))
        {
            // Hai request cùng key chạy song song: lấy lại đơn đã tạo.
            var existing = await db.Orders
                .FirstOrDefaultAsync(o => o.IdempotencyKey == idempotencyKey && o.KhachHangId == khachHangId);
            if (existing is not null)
            {
                return existing;
            }
            throw;
        }

        return order;
    }

    private static void ValidateNgayHen(DateOnly ngayHen)
    {
        var today = DateOnly.FromDateTime(DateTime.Now);
        var days = ngayHen.DayNumber - today.DayNumber;
        if (days is < 2 or > 30)
        {
            throw ApiException.Unprocessable("Ngày hẹn khảo sát phải từ 2 đến 30 ngày kể từ hôm nay.", "INVALID_NGAY_HEN");
        }
        if (ngayHen.DayOfWeek == DayOfWeek.Sunday)
        {
            throw ApiException.Unprocessable("Ngày hẹn khảo sát không được vào Chủ nhật.", "INVALID_NGAY_HEN");
        }
    }

    /// <summary>Sinh mã đơn dạng DH-yyyyMMdd-nnnn (số thứ tự theo ngày).</summary>
    private async Task<string> GenerateMaDonAsync(DateTime now)
    {
        var datePart = now.ToString("yyyyMMdd");
        var prefix = $"DH-{datePart}-";
        var countToday = await db.Orders.CountAsync(o => o.MaDon.StartsWith(prefix));
        return $"{prefix}{countToday + 1:D4}";
    }
}
