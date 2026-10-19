using System.ComponentModel.DataAnnotations;

namespace api.Dtos;

public record RegisterRequest(
    [Required] string SoDienThoai,
    [Required, MinLength(6)] string MatKhau,
    [Required] string HoTen);

public record LoginRequest(
    [Required] string SoDienThoai,
    [Required] string MatKhau);

public record UserDto(long Id, string? SoDienThoai, string? HoTen, string VaiTro);

public record AuthResponse(string Token, UserDto User);
