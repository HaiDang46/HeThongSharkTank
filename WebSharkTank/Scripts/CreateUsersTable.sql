USE SharkTankDb;
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Users' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE [dbo].[Users] (
        [Id] INT IDENTITY(1,1) NOT NULL,
        [Name] NVARCHAR(200) NOT NULL,
        [Email] NVARCHAR(200) NOT NULL,
        [PasswordHash] NVARCHAR(500) NOT NULL,
        [CreatedAt] DATETIME NOT NULL DEFAULT GETDATE(),
        [UpdatedAt] DATETIME NULL,
        [LastLoginAt] DATETIME NULL,
        CONSTRAINT [PK_Users] PRIMARY KEY CLUSTERED ([Id] ASC)
    );
    
    -- Tạo unique index cho Email
    CREATE UNIQUE INDEX [IX_Users_Email] ON [dbo].[Users]([Email]);
    
    PRINT 'Bảng Users đã được tạo thành công!';
END
ELSE
BEGIN
    PRINT 'Bảng Users đã tồn tại.';
END
GO

