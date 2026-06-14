using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WebSharkTank.Models
{
    [Table("Products")]
    public class Product
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        [Required]
        [StringLength(200)]
        public string ProductId { get; set; } // id từ JSON (macbook-air-m4-13-2024)

        [Required]
        [StringLength(500)]
        public string Title { get; set; }

        [StringLength(200)]
        public string Link { get; set; }

        [StringLength(500)]
        public string Image { get; set; }

        [Column(TypeName = "NVARCHAR(MAX)")]
        public string Images { get; set; } // JSON array string

        [Column(TypeName = "NVARCHAR(MAX)")]
        public string Tags { get; set; } // JSON array string hoặc comma-separated

        [StringLength(50)]
        public string Price { get; set; } // "23.990.000 ₫"

        [StringLength(50)]
        public string OldPrice { get; set; }

        [StringLength(20)]
        public string Discount { get; set; } // "-11%"

        [StringLength(10)]
        public string Score { get; set; } // "4.3"

        [StringLength(20)]
        public string Sold { get; set; } // "11,7k"

        [StringLength(50)]
        public string Category { get; set; } // slide1, slide2, etc.

        public DateTime CreatedAt { get; set; } = DateTime.Now;

        public DateTime? UpdatedAt { get; set; }
    }
}

