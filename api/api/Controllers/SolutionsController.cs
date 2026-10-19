using api.Data;
using api.Dtos;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace api.Controllers;

[ApiController]
[Route("api/solutions")]
public class SolutionsController(AppDbContext db) : ControllerBase
{
    /// <summary>Danh mục giải pháp (công khai): phân trang, lọc theo nhóm, tìm theo tên.</summary>
    [HttpGet]
    public async Task<ActionResult<PagedResult<SolutionDto>>> List(
        [FromQuery] int page = 1, [FromQuery] int size = 20,
        [FromQuery] string? nhom = null, [FromQuery] string? q = null)
    {
        page = page < 1 ? 1 : page;
        size = size < 1 ? 20 : size > 50 ? 50 : size; // trần size = 50 theo đặc tả

        var query = db.Solutions.AsQueryable();
        if (!string.IsNullOrWhiteSpace(nhom))
        {
            query = query.Where(s => s.Nhom == nhom);
        }
        if (!string.IsNullOrWhiteSpace(q))
        {
            query = query.Where(s => s.Ten.Contains(q) || s.Ma.Contains(q));
        }

        var total = await query.LongCountAsync();
        var items = await query
            .OrderBy(s => s.Id)
            .Skip((page - 1) * size)
            .Take(size)
            .Select(s => new SolutionDto(s.Id, s.Ma, s.Ten, s.Nhom, s.DonGia))
            .ToListAsync();

        return Ok(new PagedResult<SolutionDto>(items, total, page, size));
    }
}
