using api.Data;
using api.Dtos;
using api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace api.Controllers;

[ApiController]
[Route("api/users")]
public class UsersController(AppDbContext db) : ControllerBase
{
    /// <summary>Danh sách kỹ thuật viên để điều hành phân công (hỗ trợ UI).</summary>
    [HttpGet("ky-thuat")]
    [Authorize(Roles = VaiTro.DieuHanh)]
    public async Task<ActionResult<IReadOnlyList<UserDto>>> KyThuat()
    {
        var items = await db.Users
            .Where(u => u.VaiTro == VaiTro.KyThuat)
            .OrderBy(u => u.Id)
            .Select(u => new UserDto(u.Id, u.SoDienThoai, u.HoTen, u.VaiTro))
            .ToListAsync();
        return Ok(items);
    }
}
