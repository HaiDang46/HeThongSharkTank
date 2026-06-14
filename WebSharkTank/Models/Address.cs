using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WebSharkTank.Models
{
    [Table("Addresses")]
    public class Address
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        [Required]
        public int UserId { get; set; }

        [Required]
        [StringLength(200)]
        public string Name { get; set; }

        [Required]
        [StringLength(20)]
        public string Phone { get; set; }

        [Required]
        [StringLength(500)]
        public string StreetAddress { get; set; }

        [Required]
        [StringLength(100)]
        public string Province { get; set; }

        [StringLength(100)]
        public string District { get; set; } // Quận/Huyện

        [StringLength(100)]
        public string Ward { get; set; } // Phường/Xã

        public bool IsDefault { get; set; } = false;

        public DateTime CreatedAt { get; set; } = DateTime.Now;

        public DateTime? UpdatedAt { get; set; }

        // Foreign key relationship
        [ForeignKey("UserId")]
        public virtual User User { get; set; }
    }
}

