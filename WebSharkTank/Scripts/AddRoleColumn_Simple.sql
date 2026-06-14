-- Script đơn giản để thêm cột Role vào bảng Users
-- Database: SharkTankDb
-- Role: 0 = User (mặc định), 99 = Admin

USE [SharkTankDb]
GO

-- Bước 1: Thêm cột Role (chỉ chạy nếu cột chưa tồn tại)
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'[dbo].[Users]') 
    AND name = 'Role'
)
BEGIN
    ALTER TABLE [dbo].[Users]
    ADD [Role] INT NOT NULL DEFAULT 0;
    
    PRINT 'Đã thêm cột Role vào bảng Users thành công!';
END
ELSE
BEGIN
    PRINT 'Cột Role đã tồn tại.';
END
GO

-- Bước 2: Cập nhật giá trị mặc định cho các user hiện tại (nếu có NULL)
UPDATE [dbo].[Users]
SET [Role] = 0
WHERE [Role] IS NULL;
GO

PRINT 'Hoàn thành!';
PRINT 'Để cấp quyền Admin cho user, chạy:';
PRINT 'UPDATE [dbo].[Users] SET [Role] = 99 WHERE [Email] = ''email_của_bạn@example.com'';';
GO

