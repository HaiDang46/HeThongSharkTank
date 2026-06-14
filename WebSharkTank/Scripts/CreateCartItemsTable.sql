-- Tạo bảng CartItems để lưu giỏ hàng theo user
USE SharkTankDb;
GO

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[CartItems]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[CartItems] (
        [Id] INT IDENTITY(1,1) PRIMARY KEY,
        [UserId] INT NOT NULL,
        [ProductId] NVARCHAR(100) NOT NULL,
        [ProductName] NVARCHAR(500) NOT NULL,
        [Price] DECIMAL(18,2) NOT NULL,
        [ProductImage] NVARCHAR(1000) NULL,
        [Quantity] INT NOT NULL DEFAULT 1,
        [CreatedAt] DATETIME NOT NULL DEFAULT GETDATE(),
        [UpdatedAt] DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT [FK_CartItems_Users] FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users]([Id]) ON DELETE CASCADE
    );

    -- Tạo index để tìm nhanh giỏ hàng của user
    CREATE INDEX [IX_CartItems_UserId] ON [dbo].[CartItems]([UserId]);
    
    -- Tạo unique constraint để mỗi user chỉ có 1 record cho mỗi product
    CREATE UNIQUE INDEX [IX_CartItems_UserId_ProductId] ON [dbo].[CartItems]([UserId], [ProductId]);
END
GO

