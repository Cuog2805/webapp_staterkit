using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace api.Models;

[Table("solutions")]
[Index(nameof(Ma), IsUnique = true)]
[Index(nameof(Nhom))]
public class Solution
{
    [Key]
    [Column("id")]
    public long Id { get; set; }

    [Required]
    [MaxLength(50)]
    [Column("ma")]
    public string Ma { get; set; } = string.Empty;

    [Required]
    [MaxLength(255)]
    [Column("ten")]
    public string Ten { get; set; } = string.Empty;

    [Required]
    [MaxLength(30)]
    [Column("nhom")]
    public string Nhom { get; set; } = string.Empty;

    [Column("don_gia")]
    public decimal DonGia { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }
}
