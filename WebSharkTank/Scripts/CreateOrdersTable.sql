USE SharkTankDb;
GO

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

