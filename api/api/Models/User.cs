using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace api.Models;

[Table("users")]
[Index(nameof(Email), IsUnique = true)]
[Index(nameof(SoDienThoai), IsUnique = true)]
public class User
{
    [Key]
    [Column("id")]
    public long Id { get; set; }

    [MaxLength(255)]
    [Column("email")]
    public string? Email { get; set; }

    [MaxLength(20)]
    [Column("so_dien_thoai")]
    public string? SoDienThoai { get; set; }

    [Required]
    [MaxLength(255)]
    [Column("password_hash")]
    public string PasswordHash { get; set; } = string.Empty;

    [MaxLength(100)]
    [Column("ho_ten")]
    public string? HoTen { get; set; }

    [MaxLength(100)]
    [Column("display_name")]
    public string? DisplayName { get; set; }

    [Required]
    [MaxLength(20)]
    [Column("vai_tro")]
    public string VaiTro { get; set; } = Models.VaiTro.KhachHang;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; }
}
