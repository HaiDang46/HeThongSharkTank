using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WebSharkTank.Models
{
    [Table("OrderItems")]
    public class OrderItem
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        [Required]
        public int OrderId { get; set; }

        [Required]
        [StringLength(100)]
        public string ProductId { get; set; }

        [Required]
        [StringLength(500)]
        public string ProductName { get; set; }

        [Required]
        public decimal Price { get; set; }

        [Required]
        public int Quantity { get; set; }

        [StringLength(1000)]
        public string ProductImage { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.Now;

        // Foreign key relationship
        [ForeignKey("OrderId")]
        public virtual Order Order { get; set; }
    }
}

