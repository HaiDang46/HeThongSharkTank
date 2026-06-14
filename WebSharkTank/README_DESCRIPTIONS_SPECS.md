# Hướng dẫn Import Descriptions và Specs vào SQL Server

## Bước 1: Tạo bảng trong SQL Server

Chạy các script SQL sau trong SQL Server Management Studio (SSMS):

1. **Tạo bảng ProductDescriptions:**
   ```sql
   -- Chạy file: Scripts/CreateProductDescriptionsTable.sql
   ```

2. **Tạo bảng ProductSpecs:**
   ```sql
   -- Chạy file: Scripts/CreateProductSpecsTable.sql
   ```

Hoặc chạy trực tiếp:

```sql
USE SharkTankDb;
GO

-- Tạo bảng ProductDescriptions
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ProductDescriptions')
BEGIN
    CREATE TABLE [dbo].[ProductDescriptions] (
        [Id] INT IDENTITY(1,1) NOT NULL,
        [ProductId] NVARCHAR(200) NOT NULL,
        [DescriptionHtml] NVARCHAR(MAX) NULL,
        [CreatedAt] DATETIME NOT NULL DEFAULT GETDATE(),
        [UpdatedAt] DATETIME NULL,
        CONSTRAINT [PK_ProductDescriptions] PRIMARY KEY CLUSTERED ([Id] ASC)
    );
    
    CREATE INDEX [IX_ProductDescriptions_ProductId] ON [dbo].[ProductDescriptions]([ProductId]);
END;
GO

-- Tạo bảng ProductSpecs
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ProductSpecs')
BEGIN
    CREATE TABLE [dbo].[ProductSpecs] (
        [Id] INT IDENTITY(1,1) NOT NULL,
        [ProductId] NVARCHAR(200) NOT NULL,
        [SpecsJson] NVARCHAR(MAX) NULL,
        [CreatedAt] DATETIME NOT NULL DEFAULT GETDATE(),
        [UpdatedAt] DATETIME NULL,
        CONSTRAINT [PK_ProductSpecs] PRIMARY KEY CLUSTERED ([Id] ASC)
    );
    
    CREATE INDEX [IX_ProductSpecs_ProductId] ON [dbo].[ProductSpecs]([ProductId]);
END;
GO
```

## Bước 2: Import dữ liệu

### Cách 1: Qua Admin Panel (Khuyến nghị)

1. **Import Mô tả:**
   - Truy cập: `http://localhost:58951/Admin/ImportDescriptions`
   - Click "Bắt đầu Import"

2. **Import Thông số:**
   - Truy cập: `http://localhost:58951/Admin/ImportSpecs`
   - Click "Bắt đầu Import"

### Cách 2: Qua Import chính

- Truy cập: `http://localhost:58951/Admin/Import`
- Click các nút tương ứng:
  - "Import Mô tả" → Import từ `App_Data/descriptions.json`
  - "Import Thông số" → Import từ `App_Data/specs.json`

## Cấu trúc dữ liệu

### ProductDescriptions
- **ProductId**: ID sản phẩm (khóa ngoại đến Products.ProductId)
- **DescriptionHtml**: Mảng JSON các chuỗi HTML mô tả sản phẩm

### ProductSpecs
- **ProductId**: ID sản phẩm (khóa ngoại đến Products.ProductId)
- **SpecsJson**: Object JSON chứa các thông số kỹ thuật (key-value pairs)

## API Endpoints

Sau khi import, có thể sử dụng các API sau:

1. **GetProductDetail** - Trả về đầy đủ thông tin (bao gồm description và specs):
   ```
   GET /Home/GetProductDetail?id={productId}
   ```

2. **GetProductDescription** - Chỉ lấy mô tả:
   ```
   GET /Home/GetProductDescription?id={productId}
   ```

3. **GetProductSpecs** - Chỉ lấy thông số:
   ```
   GET /Home/GetProductSpecs?id={productId}
   ```

## Lưu ý

- Đảm bảo đã import sản phẩm trước (từ `products.json`)
- ProductId trong descriptions.json và specs.json phải khớp với ProductId trong Products table
- Nếu sản phẩm đã có description/specs, sẽ được cập nhật thay vì tạo mới

