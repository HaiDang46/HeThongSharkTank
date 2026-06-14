using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WebSharkTank.Models
{
    [Table("Orders")]
    public class Order
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        [Required]
        public int UserId { get; set; }

        [Required]
        public int AddressId { get; set; }

        [Required]
        [StringLength(50)]
        public string PaymentMethod { get; set; } // COD, VNPAY_QR, VNPAY_MOBILE, etc.

        [Required]
        public decimal TotalAmount { get; set; }

        [Required]
        public decimal ShippingFee { get; set; } = 0;

        [Required]
        [StringLength(50)]
        public string Status { get; set; } = "Pending"; // Pending, Processing, Shipped, Delivered, Cancelled

        [StringLength(500)]
        public string Notes { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.Now;

        public DateTime? UpdatedAt { get; set; }

        // Foreign key relationships
        [ForeignKey("UserId")]
        public virtual User User { get; set; }

        [ForeignKey("AddressId")]
        public virtual Address Address { get; set; }
    }
}

