using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WebSharkTank.Models
{
    [Table("ProductSpecs")]
    public class ProductSpec
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        [Required]
        [StringLength(200)]
        public string ProductId { get; set; } // Foreign key to Products.ProductId

        [Column(TypeName = "NVARCHAR(MAX)")]
        public string SpecsJson { get; set; } // Store specs as JSON object string

        [NotMapped]
        public System.Collections.Generic.Dictionary<string, string> Specs
        {
            get => string.IsNullOrEmpty(SpecsJson) 
                ? new System.Collections.Generic.Dictionary<string, string>() 
                : Newtonsoft.Json.JsonConvert.DeserializeObject<System.Collections.Generic.Dictionary<string, string>>(SpecsJson);
            set => SpecsJson = Newtonsoft.Json.JsonConvert.SerializeObject(value);
        }

        public DateTime CreatedAt { get; set; } = DateTime.Now;
        public DateTime? UpdatedAt { get; set; }
    }
}

