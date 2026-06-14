using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WebSharkTank.Models
{
    [Table("ProductDescriptions")]
    public class ProductDescription
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        [Required]
        [StringLength(200)]
        public string ProductId { get; set; } // Foreign key to Products.ProductId

        [Column(TypeName = "NVARCHAR(MAX)")]
        public string DescriptionHtml { get; set; } // Store HTML content as JSON array string

        [NotMapped]
        public System.Collections.Generic.List<string> Description
        {
            get => string.IsNullOrEmpty(DescriptionHtml) 
                ? new System.Collections.Generic.List<string>() 
                : Newtonsoft.Json.JsonConvert.DeserializeObject<System.Collections.Generic.List<string>>(DescriptionHtml);
            set => DescriptionHtml = Newtonsoft.Json.JsonConvert.SerializeObject(value);
        }

        public DateTime CreatedAt { get; set; } = DateTime.Now;
        public DateTime? UpdatedAt { get; set; }
    }
}

