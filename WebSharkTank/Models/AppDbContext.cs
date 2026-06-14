using System.Data.Entity;

namespace WebSharkTank.Models
{
    public class AppDbContext : DbContext
    {
        public AppDbContext() : base("name=AppDbContext")
        {
            try
            {
                // Không tự động tạo database, để tránh lỗi khi start
                Database.SetInitializer<AppDbContext>(null);
                // Tắt lazy loading để tránh lỗi khi database chưa sẵn sàng
                this.Configuration.LazyLoadingEnabled = false;
                this.Configuration.ProxyCreationEnabled = false;
            }
            catch
            {
                // Ignore errors during initialization
            }
        }

        public DbSet<Product> Products { get; set; }
        public DbSet<ProductDescription> ProductDescriptions { get; set; }
        public DbSet<ProductSpec> ProductSpecs { get; set; }
        public DbSet<User> Users { get; set; }
        public DbSet<CartItem> CartItems { get; set; }
        public DbSet<Address> Addresses { get; set; }
        public DbSet<Order> Orders { get; set; }
        public DbSet<OrderItem> OrderItems { get; set; }

        protected override void OnModelCreating(DbModelBuilder modelBuilder)
        {
            try
            {
                base.OnModelCreating(modelBuilder);
                
                // Tạo unique index cho Email (chỉ khi bảng Users tồn tại)
                try
                {
                    modelBuilder.Entity<User>()
                        .HasIndex(u => u.Email)
                        .IsUnique();
                }
                catch
                {
                    // Ignore nếu không thể tạo index (bảng chưa tồn tại)
                }
            }
            catch
            {
                // Ignore errors during model creation
            }
        }
    }
}

