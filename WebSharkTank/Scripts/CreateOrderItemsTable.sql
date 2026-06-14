USE SharkTankDb;
GO

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
    
    -- Tạo index cho OrderId để tăng tốc độ truy vấn
    CREATE INDEX [IX_OrderItems_OrderId] ON [dbo].[OrderItems]([OrderId]);
    CREATE INDEX [IX_OrderItems_ProductId] ON [dbo].[OrderItems]([ProductId]);
    
    PRINT 'Bảng OrderItems đã được tạo thành công!';
END
ELSE
BEGIN
    PRINT 'Bảng OrderItems đã tồn tại.';
END
GO

