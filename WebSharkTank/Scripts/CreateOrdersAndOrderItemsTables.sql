-- Script tạo bảng Orders và OrderItems trong SQL Server
-- Chạy script này để tạo cả hai bảng cùng lúc

USE SharkTankDb;
GO

-- ============================================
-- 1. Tạo bảng Orders
-- ============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Orders' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE [dbo].[Orders] (
        [Id] INT IDENTITY(1,1) NOT NULL,
        [UserId] INT NOT NULL,
        [AddressId] INT NOT NULL,
        [PaymentMethod] NVARCHAR(50) NOT NULL,
        [TotalAmount] DECIMAL(18,2) NOT NULL,
        [ShippingFee] DECIMAL(18,2) NOT NULL DEFAULT 0,
        [Status] NVARCHAR(50) NOT NULL DEFAULT 'Pending',
        [Notes] NVARCHAR(500) NULL,
        [CreatedAt] DATETIME NOT NULL DEFAULT GETDATE(),
        [UpdatedAt] DATETIME NULL,
        CONSTRAINT [PK_Orders] PRIMARY KEY CLUSTERED ([Id] ASC),
        CONSTRAINT [FK_Orders_Users] FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users]([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_Orders_Addresses] FOREIGN KEY ([AddressId]) REFERENCES [dbo].[Addresses]([Id]) ON DELETE NO ACTION
    );
    
    -- Tạo index cho UserId và Status để tăng tốc độ truy vấn
    CREATE INDEX [IX_Orders_UserId] ON [dbo].[Orders]([UserId]);
    CREATE INDEX [IX_Orders_Status] ON [dbo].[Orders]([Status]);
    CREATE INDEX [IX_Orders_CreatedAt] ON [dbo].[Orders]([CreatedAt]);
    
    PRINT 'Bảng Orders đã được tạo thành công!';
END
ELSE
BEGIN
    PRINT 'Bảng Orders đã tồn tại.';
END
GO

-- ============================================
-- 2. Tạo bảng OrderItems
-- ============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'OrderItems' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE [dbo].[OrderItems] (
        [Id] INT IDENTITY(1,1) NOT NULL,
        [OrderId] INT NOT NULL,
        [ProductId] NVARCHAR(100) NOT NULL,
        [ProductName] NVARCHAR(500) NOT NULL,
        [Price] DECIMAL(18,2) NOT NULL,
        [Quantity] INT NOT NULL,
        [ProductImage] NVARCHAR(1000) NULL,
        [CreatedAt] DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT [PK_OrderItems] PRIMARY KEY CLUSTERED ([Id] ASC),
        CONSTRAINT [FK_OrderItems_Orders] FOREIGN KEY ([OrderId]) REFERENCES [dbo].[Orders]([Id]) ON DELETE CASCADE
    );
    
    -- Tạo index cho OrderId và ProductId để tăng tốc độ truy vấn
    CREATE INDEX [IX_OrderItems_OrderId] ON [dbo].[OrderItems]([OrderId]);
    CREATE INDEX [IX_OrderItems_ProductId] ON [dbo].[OrderItems]([ProductId]);
    
    PRINT 'Bảng OrderItems đã được tạo thành công!';
END
ELSE
BEGIN
    PRINT 'Bảng OrderItems đã tồn tại.';
END
GO

PRINT 'Hoàn tất tạo bảng Orders và OrderItems!';
GO

