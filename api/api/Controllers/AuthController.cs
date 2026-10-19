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
[Route("api/auth")]
public class AuthController(AppDbContext db, TokenService tokenService) : ControllerBase
{
    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register(RegisterRequest request)
    {
        var soDienThoai = request.SoDienThoai.Trim();

        if (await db.Users.AnyAsync(u => u.SoDienThoai == soDienThoai))
        {
            throw ApiException.Conflict("Số điện thoại đã được sử dụng.", "PHONE_TAKEN");
        }

        var user = new User
        {
            SoDienThoai = soDienThoai,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.MatKhau),
            HoTen = request.HoTen.Trim(),
            VaiTro = VaiTro.KhachHang, // đăng ký mới luôn là khách hàng
        };

        db.Users.Add(user);
        await db.SaveChangesAsync();

        return Ok(BuildResponse(user));
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest request)
    {
        var soDienThoai = request.SoDienThoai.Trim();
        var user = await db.Users.FirstOrDefaultAsync(u => u.SoDienThoai == soDienThoai);

        if (user is null || !BCrypt.Net.BCrypt.Verify(request.MatKhau, user.PasswordHash))
        {
            throw ApiException.Unauthorized("Số điện thoại hoặc mật khẩu không đúng.", "INVALID_CREDENTIALS");
        }

        return Ok(BuildResponse(user));
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<ActionResult<UserDto>> Me()
    {
        var userId = User.GetUserId() ?? throw ApiException.Unauthorized("Token không hợp lệ.");
        var user = await db.Users.FindAsync(userId) ?? throw ApiException.Unauthorized("Token không hợp lệ.");
        return Ok(ToDto(user));
    }

    private AuthResponse BuildResponse(User user) => new(tokenService.CreateToken(user), ToDto(user));

    private static UserDto ToDto(User user) => new(user.Id, user.SoDienThoai, user.HoTen, user.VaiTro);
}
