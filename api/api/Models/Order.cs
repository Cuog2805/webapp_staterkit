using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace api.Models;

[Table("orders")]
[Index(nameof(MaDon), IsUnique = true)]
[Index(nameof(IdempotencyKey), IsUnique = true)]
[Index(nameof(KhachHangId))]
[Index(nameof(KtvId))]
[Index(nameof(TrangThai))]
public class Order
{
    [Key]
    [Column("id")]
    public long Id { get; set; }

    [Required]
    [MaxLength(20)]
    [Column("ma_don")]
    public string MaDon { get; set; } = string.Empty;

    [Column("khach_hang_id")]
    public long KhachHangId { get; set; }

    [Column("ktv_id")]
    public long? KtvId { get; set; }

    [Required]
    [MaxLength(255)]
    [Column("dia_chi")]
    public string DiaChi { get; set; } = string.Empty;

    [Column("ngay_hen")]
    public DateOnly NgayHen { get; set; }

    [Required]
    [MaxLength(20)]
    [Column("trang_thai")]
    public string TrangThai { get; set; } = TrangThaiDon.Moi;

    [Column("tong_tien")]
    public decimal TongTien { get; set; }

    [Column("giam_gia")]
    public decimal GiamGia { get; set; }

    [Column("thanh_toan")]
    public decimal ThanhToan { get; set; }

    [ConcurrencyCheck]
    [Column("version")]
    public int Version { get; set; }

    [MaxLength(100)]
    [Column("idempotency_key")]
    public string? IdempotencyKey { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; }

    [ForeignKey(nameof(KhachHangId))]
    public User? KhachHang { get; set; }

    [ForeignKey(nameof(KtvId))]
    public User? Ktv { get; set; }
    [ForeignKey(nameof(OrderItem.DonId))]
    public List<OrderItem> Items { get; set; } = [];

    [ForeignKey(nameof(OrderStatusHistory.DonId))]
    public List<OrderStatusHistory> History { get; set; } = [];
}
