-- Script tạo bảng Products trong SQL Server
USE SharkTankDb;
GO

-- Tạo bảng Products
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Products]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[Products] (
        [Id] INT IDENTITY(1,1) PRIMARY KEY,
        [ProductId] NVARCHAR(200) NOT NULL,
        [Title] NVARCHAR(500) NOT NULL,
        [Link] NVARCHAR(200) NULL,
        [Image] NVARCHAR(500) NULL,
        [Images] NVARCHAR(MAX) NULL,
        [Tags] NVARCHAR(MAX) NULL,
        [Price] NVARCHAR(50) NULL,
        [OldPrice] NVARCHAR(50) NULL,
        [Discount] NVARCHAR(20) NULL,
        [Score] NVARCHAR(10) NULL,
        [Sold] NVARCHAR(20) NULL,
        [Category] NVARCHAR(50) NULL,
        [CreatedAt] DATETIME NOT NULL DEFAULT GETDATE(),
        [UpdatedAt] DATETIME NULL
    );

    -- Tạo index cho ProductId và Category để tìm kiếm nhanh hơn
    CREATE INDEX IX_Products_ProductId ON [dbo].[Products]([ProductId]);
    CREATE INDEX IX_Products_Category ON [dbo].[Products]([Category]);
    
    PRINT 'Bảng Products đã được tạo thành công!';
END
ELSE
BEGIN
    PRINT 'Bảng Products đã tồn tại.';
END
GO

