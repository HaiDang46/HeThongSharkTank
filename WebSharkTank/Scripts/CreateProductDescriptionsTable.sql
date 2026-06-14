USE SharkTankDb;
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ProductDescriptions' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE [dbo].[ProductDescriptions] (
        [Id] INT IDENTITY(1,1) NOT NULL,
        [ProductId] NVARCHAR(200) NOT NULL,
        [DescriptionHtml] NVARCHAR(MAX) NULL,
        [CreatedAt] DATETIME NOT NULL DEFAULT GETDATE(),
        [UpdatedAt] DATETIME NULL,
        CONSTRAINT [PK_ProductDescriptions] PRIMARY KEY CLUSTERED ([Id] ASC),
        -- Foreign key sẽ được thêm sau khi Products.ProductId có unique constraint
        -- CONSTRAINT [FK_ProductDescriptions_Products] FOREIGN KEY ([ProductId]) 
        --     REFERENCES [dbo].[Products]([ProductId]) ON DELETE CASCADE
    );
    
    CREATE INDEX [IX_ProductDescriptions_ProductId] ON [dbo].[ProductDescriptions]([ProductId]);
END;
GO

