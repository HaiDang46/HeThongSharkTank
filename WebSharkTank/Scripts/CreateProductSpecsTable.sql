USE SharkTankDb;
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ProductSpecs' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE [dbo].[ProductSpecs] (
        [Id] INT IDENTITY(1,1) NOT NULL,
        [ProductId] NVARCHAR(200) NOT NULL,
        [SpecsJson] NVARCHAR(MAX) NULL,
        [CreatedAt] DATETIME NOT NULL DEFAULT GETDATE(),
        [UpdatedAt] DATETIME NULL,
        CONSTRAINT [PK_ProductSpecs] PRIMARY KEY CLUSTERED ([Id] ASC),
        -- Foreign key sẽ được thêm sau khi Products.ProductId có unique constraint
        -- CONSTRAINT [FK_ProductSpecs_Products] FOREIGN KEY ([ProductId]) 
        --     REFERENCES [dbo].[Products]([ProductId]) ON DELETE CASCADE
    );
    
    CREATE INDEX [IX_ProductSpecs_ProductId] ON [dbo].[ProductSpecs]([ProductId]);
END;
GO

