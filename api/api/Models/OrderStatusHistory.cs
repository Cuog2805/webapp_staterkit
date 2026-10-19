using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace api.Models;

[Table("order_status_history")]
[Index(nameof(DonId))]
public class OrderStatusHistory
{
    [Key]
    [Column("id")]
    public long Id { get; set; }

    [Column("don_id")]
    public long DonId { get; set; }

    [MaxLength(20)]
    [Column("tu_trang_thai")]
    public string? TuTrangThai { get; set; }

    [Required]
    [MaxLength(20)]
    [Column("den_trang_thai")]
    public string DenTrangThai { get; set; } = string.Empty;

    [Column("nguoi_thuc_hien_id")]
    public long? NguoiThucHienId { get; set; }

    [MaxLength(255)]
    [Column("ly_do")]
    public string? LyDo { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    [ForeignKey(nameof(NguoiThucHienId))]
    public User? NguoiThucHien { get; set; }
}
