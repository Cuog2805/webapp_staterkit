using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace api.Infrastructure;

public static class ClaimsPrincipalExtensions
{
    /// <summary>Id người dùng từ claim sub (hoặc NameIdentifier).</summary>
    public static long? GetUserId(this ClaimsPrincipal user)
    {
        var sub = user.FindFirstValue(JwtRegisteredClaimNames.Sub)
                  ?? user.FindFirstValue(ClaimTypes.NameIdentifier);
        return long.TryParse(sub, out var id) ? id : null;
    }

    /// <summary>Vai trò từ claim role.</summary>
    public static string? GetRole(this ClaimsPrincipal user) => user.FindFirstValue(ClaimTypes.Role);
}
