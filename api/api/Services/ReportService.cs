using api.Data;
using api.Dtos;
using api.Models;
using Microsoft.EntityFrameworkCore;

namespace api.Services;

public class ReportService(AppDbContext db)
{
    /// <summary>Báo cáo tổng hợp (B1): số đơn theo trạng thái, doanh thu theo nhóm (trừ HUY), tỷ lệ hủy.</summary>
    public async Task<ReportSummaryDto> SummaryAsync(DateOnly? tuNgay, DateOnly? denNgay)
    {
        var orders = db.Orders.AsQueryable();
        if (tuNgay is { } tu)
        {
            var from = tu.ToDateTime(TimeOnly.MinValue);
            orders = orders.Where(o => o.CreatedAt >= from);
        }
        if (denNgay is { } den)
        {
            var to = den.ToDateTime(TimeOnly.MaxValue);
            orders = orders.Where(o => o.CreatedAt <= to);
        }

        // Số đơn theo trạng thái (đủ 5 trạng thái, kể cả 0).
        var counts = await orders
            .GroupBy(o => o.TrangThai)
            .Select(g => new { TrangThai = g.Key, SoLuong = (long)g.Count() })
            .ToListAsync();
        var countMap = counts.ToDictionary(c => c.TrangThai, c => c.SoLuong);
        var soDonTheoTrangThai = TrangThaiDon.All
            .Select(t => new StatusCountDto(t, countMap.GetValueOrDefault(t, 0)))
            .ToList();

        var tongSoDon = countMap.Values.Sum();
        var soHuy = countMap.GetValueOrDefault(TrangThaiDon.Huy, 0);
        var tyLeHuy = tongSoDon == 0 ? 0 : Math.Round(soHuy * 100m / tongSoDon, 2, MidpointRounding.AwayFromZero);

        // Doanh thu dự kiến theo nhóm giải pháp (không tính đơn HUY).
        var revenue = await db.OrderItems
            .Where(i => db.Orders.Any(o => o.Id == i.DonId && o.TrangThai != TrangThaiDon.Huy))
            .GroupBy(i => i.Nhom)
            .Select(g => new RevenueByGroupDto(g.Key, g.Sum(i => i.ThanhTien)))
            .ToListAsync();

        return new ReportSummaryDto(soDonTheoTrangThai, revenue, tyLeHuy, tongSoDon);
    }
}
