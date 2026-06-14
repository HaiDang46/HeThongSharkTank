# Hướng dẫn chuyển đổi từ JSON sang SQL Server

## Bước 0: Khởi động ứng dụng

1. Mở project trong **Visual Studio**
2. Nhấn **F5** hoặc **Ctrl+F5** để chạy ứng dụng
3. Nếu gặp lỗi `ERR_CONNECTION_REFUSED`:
   - Đảm bảo đã **Rebuild Solution** (Build → Rebuild Solution)
   - Kiểm tra **Output** window xem có lỗi compile không
   - Thử **Stop** và **Start** lại ứng dụng

## Bước 1: Tạo Database và Bảng

1. Mở **SQL Server Management Studio (SSMS)** hoặc **Visual Studio SQL Server Object Explorer**
2. Kết nối đến `(localdb)\MSSQLLocalDB`
3. Tạo database `SharkTankDb` (nếu chưa có):
   ```sql
   IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'SharkTankDb')
   CREATE DATABASE SharkTankDb;
   GO
   ```
4. Chọn database `SharkTankDb` và chạy script `Scripts/CreateProductsTable.sql` để tạo bảng Products

## Bước 2: Import dữ liệu từ JSON vào SQL

**Cách đơn giản nhất:**

1. Đảm bảo file `App_Data/products.json` đã có dữ liệu
2. Đảm bảo ứng dụng đang chạy (xem Bước 0)
3. Truy cập: `http://localhost:58951/Home/ImportProducts` (thay port nếu khác)
4. Script sẽ tự động import tất cả dữ liệu từ JSON vào SQL Server
5. Bạn sẽ thấy thông báo: "Import thành công! Sản phẩm mới: X, Sản phẩm cập nhật: Y"

## Bước 3: Cập nhật code JavaScript (nếu cần)

Code JavaScript hiện tại đã tương thích:
- `products-sql.js` đã gọi `/Home/GetProducts`
- `app.js` có thể cần cập nhật để gọi API thay vì đọc JSON file

## Bước 4: Kiểm tra

1. Truy cập: `http://localhost:port/Home/GetProducts`
2. Nên thấy JSON response với dữ liệu từ SQL Server

## Lưu ý

- Connection string đã được cấu hình trong `Web.config`
- Database: `SharkTankDb` trên `(localdb)\MSSQLLocalDB`
- Sau khi import, có thể xóa hoặc giữ file `products.json` làm backup

