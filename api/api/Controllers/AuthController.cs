using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using api.Data;
using api.Dtos;
using api.Models;
using api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace api.Controllers;

[ApiController]
[Route("auth")]
public class AuthController(AppDbContext db, TokenService tokenService, IWebHostEnvironment env) : ControllerBase
{
    [HttpPost("register")]
    public async Task<ActionResult<UserDto>> Register(RegisterRequest request)
    {
        var email = request.Email.Trim().ToLowerInvariant();

        if (await db.Users.AnyAsync(u => u.Email == email))
        {
            return Conflict(new { message = "Email đã được sử dụng." });
        }

        var user = new User
        {
            Email = email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            DisplayName = string.IsNullOrWhiteSpace(request.DisplayName) ? null : request.DisplayName.Trim(),
        };

        db.Users.Add(user);
        await db.SaveChangesAsync();

        SetAuthCookie(tokenService.CreateToken(user));
        return Ok(new UserDto(user.Id, user.Email, user.DisplayName));
    }

    [HttpPost("login")]
    public async Task<ActionResult<UserDto>> Login(LoginRequest request)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == email);

        if (user is null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            return Unauthorized(new { message = "Email hoặc mật khẩu không đúng." });
        }

        SetAuthCookie(tokenService.CreateToken(user));
        return Ok(new UserDto(user.Id, user.Email, user.DisplayName));
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<ActionResult<UserDto>> Me()
    {
        var sub = User.FindFirstValue(JwtRegisteredClaimNames.Sub)
                  ?? User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (!long.TryParse(sub, out var userId))
        {
            return Unauthorized();
        }

        var user = await db.Users.FindAsync(userId);
        if (user is null)
        {
            return Unauthorized();
        }

        return Ok(new UserDto(user.Id, user.Email, user.DisplayName));
    }

    [HttpPost("logout")]
    public IActionResult Logout()
    {
        Response.Cookies.Delete("auth_token", new CookieOptions
        {
            HttpOnly = true,
            Secure = !env.IsDevelopment(),
            SameSite = SameSiteMode.Lax,
            Path = "/",
        });
        return NoContent();
    }

    private void SetAuthCookie(string token) =>
        Response.Cookies.Append("auth_token", token, new CookieOptions
        {
            HttpOnly = true,
            Secure = !env.IsDevelopment(),   // false ở dev (http), true ở prod
            SameSite = SameSiteMode.Lax,
            Path = "/",
            Expires = DateTimeOffset.UtcNow.AddMinutes(tokenService.ExpireMinutes),
        });
}
