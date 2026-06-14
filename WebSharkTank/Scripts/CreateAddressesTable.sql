USE SharkTankDb;
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Addresses' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE [dbo].[Addresses] (
        [Id] INT IDENTITY(1,1) NOT NULL,
        [UserId] INT NOT NULL,
        [Name] NVARCHAR(200) NOT NULL,
        [Phone] NVARCHAR(20) NOT NULL,
        [StreetAddress] NVARCHAR(500) NOT NULL,
        [Province] NVARCHAR(100) NOT NULL,
        [IsDefault] BIT NOT NULL DEFAULT 0,
        [CreatedAt] DATETIME NOT NULL DEFAULT GETDATE(),
        [UpdatedAt] DATETIME NULL,
        CONSTRAINT [PK_Addresses] PRIMARY KEY CLUSTERED ([Id] ASC),
        CONSTRAINT [FK_Addresses_Users] FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users]([Id]) ON DELETE CASCADE
    );
    
    -- Tạo index cho UserId để tăng tốc độ truy vấn
    CREATE INDEX [IX_Addresses_UserId] ON [dbo].[Addresses]([UserId]);
    
    PRINT 'Bảng Addresses đã được tạo thành công!';
END
ELSE
BEGIN
    PRINT 'Bảng Addresses đã tồn tại.';
END
GO

