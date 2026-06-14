-- Add District and Ward columns to Addresses table
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Addresses]') AND name = 'District')
BEGIN
    ALTER TABLE [dbo].[Addresses]
    ADD [District] NVARCHAR(100) NULL;
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Addresses]') AND name = 'Ward')
BEGIN
    ALTER TABLE [dbo].[Addresses]
    ADD [Ward] NVARCHAR(100) NULL;
END
GO

