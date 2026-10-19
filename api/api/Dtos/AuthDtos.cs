using System.ComponentModel.DataAnnotations;

namespace api.Dtos;

public record RegisterRequest(
    [Required, EmailAddress] string Email,
    [Required, MinLength(6)] string Password,
    string? DisplayName);

public record LoginRequest(
    [Required, EmailAddress] string Email,
    [Required] string Password);

public record UserDto(long Id, string Email, string? DisplayName);

public record AuthResponse(string Token, UserDto User);
