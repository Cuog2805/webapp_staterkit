using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace api.Models;

[Table("order_items")]
[Index(nameof(DonId))]
[Index(nameof(GiaiPhapId))]
public class OrderItem
{
    [Key]
    [Column("id")]
    public long Id { get; set; }

    [Column("don_id")]
    public long DonId { get; set; }

    [Column("giai_phap_id")]
    public long GiaiPhapId { get; set; }

    [Required]
    [MaxLength(30)]
    [Column("nhom")]
    public string Nhom { get; set; } = string.Empty;

    [Column("don_gia")]
    public decimal DonGia { get; set; }

    [Column("so_luong")]
    public int SoLuong { get; set; }

    [Column("thanh_tien")]
    public decimal ThanhTien { get; set; }

    [ForeignKey(nameof(GiaiPhapId))]
    public Solution? GiaiPhap { get; set; }
}
