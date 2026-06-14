-- Script để thêm cột Role vào bảng Users
-- Role: 0 = User (mặc định), 99 = Admin
-- Database: SharkTankDb
-- Chạy script này trong SQL Server Management Studio

USE [SharkTankDb]
GO

-- Kiểm tra xem bảng Users có tồn tại không
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'Users')
BEGIN
    -- Kiểm tra xem cột Role đã tồn tại chưa
    IF NOT EXISTS (
        SELECT * FROM sys.columns 
        WHERE object_id = OBJECT_ID(N'[dbo].[Users]') 
        AND name = 'Role'
    )
    BEGIN
        -- Thêm cột Role với giá trị mặc định là 0 (User)
        ALTER TABLE [dbo].[Users]
        ADD [Role] INT NOT NULL DEFAULT 0;
        
        PRINT 'Đã thêm cột Role vào bảng Users thành công!';
    END
    ELSE
    BEGIN
        -- Nếu cột đã tồn tại, kiểm tra kiểu dữ liệu
        DECLARE @CurrentDataType NVARCHAR(50);
        SELECT @CurrentDataType = TYPE_NAME(system_type_id)
        FROM sys.columns
        WHERE object_id = OBJECT_ID(N'[dbo].[Users]') AND name = 'Role';
        
        IF @CurrentDataType = 'nvarchar' OR @CurrentDataType = 'varchar' OR @CurrentDataType = 'varchar'
        BEGIN
            -- Chuyển đổi từ string sang int
            -- Tạo cột tạm để lưu giá trị
            ALTER TABLE [dbo].[Users] ADD [RoleTemp] INT NULL;
            
            -- Chuyển đổi giá trị: 'Admin' hoặc '99' -> 99, còn lại -> 0
            UPDATE [dbo].[Users]
            SET [RoleTemp] = CASE 
                WHEN [Role] = 'Admin' OR [Role] = '99' THEN 99
                ELSE 0
            END;
            
            -- Xóa cột cũ và đổi tên cột tạm
            ALTER TABLE [dbo].[Users] DROP COLUMN [Role];
            EXEC sp_rename '[dbo].[Users].[RoleTemp]', 'Role', 'COLUMN';
            ALTER TABLE [dbo].[Users] ALTER COLUMN [Role] INT NOT NULL;
            ALTER TABLE [dbo].[Users] ADD DEFAULT 0 FOR [Role];
            
            PRINT 'Đã chuyển đổi cột Role từ string sang int thành công!';
        END
        ELSE
        BEGIN
            -- Đảm bảo giá trị mặc định là 0 cho các user có Role = NULL
            UPDATE [dbo].[Users]
            SET [Role] = 0
            WHERE [Role] IS NULL;
            
            PRINT 'Cột Role đã tồn tại trong bảng Users.';
        END
    END
END
ELSE
BEGIN
    PRINT 'Bảng Users không tồn tại!';
END
GO

-- Script để cấp quyền Admin (Role = 99) cho một user cụ thể
-- Ví dụ: Cấp quyền Admin cho user có email 'admin@example.com'
/*
UPDATE [dbo].[Users]
SET [Role] = 99
WHERE [Email] = 'admin@example.com';
GO
*/

