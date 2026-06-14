using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WebSharkTank.Models
{
    public class CartItem
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int UserId { get; set; }

        [Required]
        [StringLength(100)]
        public string ProductId { get; set; }

        [Required]
        [StringLength(500)]
        public string ProductName { get; set; }

        [Required]
        public decimal Price { get; set; }

        [StringLength(1000)]
        public string ProductImage { get; set; }

        [Required]
        public int Quantity { get; set; }

        public DateTime CreatedAt { get; set; }

        public DateTime UpdatedAt { get; set; }

        // Foreign key relationship
        [ForeignKey("UserId")]
        public virtual User User { get; set; }
    }
}

