using System;
using System.Collections.Generic;
using System.Linq;
using System.Web.Mvc;
using WebSharkTank.Models;
using Newtonsoft.Json;

namespace WebSharkTank.Controllers
{
    public class CartController : Controller
    {
        private AppDbContext db;

        protected override void OnActionExecuting(ActionExecutingContext filterContext)
        {
            try
            {
                if (db == null)
                {
                    db = new AppDbContext();
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"CartController AppDbContext Error: {ex.Message}");
                db = null;
            }
            base.OnActionExecuting(filterContext);
        }

        [HttpGet]
        public ActionResult GetCart()
        {
            try
            {
                if (db == null)
                {
                    return Json(new { success = false, message = "Lỗi kết nối database" }, JsonRequestBehavior.AllowGet);
                }

                // Lấy userId từ Session
                var userIdObj = Session["UserId"];
                if (userIdObj == null)
                {
                    return Json(new { success = true, items = new List<object>() }, JsonRequestBehavior.AllowGet);
                }

                int userId = Convert.ToInt32(userIdObj);
                System.Diagnostics.Debug.WriteLine($"[Cart] Getting cart for UserId: {userId}");
                
                var cartItems = db.CartItems
                    .Where(c => c.UserId == userId)
                    .OrderBy(c => c.CreatedAt)
                    .ToList();

                System.Diagnostics.Debug.WriteLine($"[Cart] Found {cartItems.Count} items in database");

                var items = cartItems.Select(c => new
                {
                    id = c.ProductId,
                    name = c.ProductName,
                    price = (double)c.Price,
                    img = c.ProductImage ?? "",
                    qty = c.Quantity
                }).ToList();

                System.Diagnostics.Debug.WriteLine($"[Cart] Returning {items.Count} items to client");
                return Json(new { success = true, items = items }, JsonRequestBehavior.AllowGet);
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"[Cart] Error in GetCart: {ex.Message}\n{ex.StackTrace}");
                if (ex.InnerException != null)
                {
                    System.Diagnostics.Debug.WriteLine($"[Cart] Inner Exception: {ex.InnerException.Message}");
                }
                return Json(new { success = false, message = $"Lỗi: {ex.Message}" }, JsonRequestBehavior.AllowGet);
            }
        }

        // POST: Cart/AddItem - Thêm sản phẩm vào giỏ hàng
        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult AddItem(string productId, string productName, decimal price, string productImage, int quantity = 1)
        {
            try
            {
                if (db == null)
                {
                    return Json(new { success = false, message = "Lỗi kết nối database" });
                }

                var userIdObj = Session["UserId"];
                if (userIdObj == null)
                {
                    return Json(new { success = false, message = "Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng" });
                }

                int userId = Convert.ToInt32(userIdObj);
                
                System.Diagnostics.Debug.WriteLine($"[Cart] AddItem - UserId: {userId}, ProductId: {productId}, Quantity: {quantity}");

                // Verify UserId exists in Users table (foreign key constraint)
                var userExists = db.Users.Any(u => u.Id == userId);
                if (!userExists)
                {
                    System.Diagnostics.Debug.WriteLine($"[Cart] ERROR: UserId {userId} does not exist in Users table!");
                    return Json(new { success = false, message = $"Lỗi: UserId {userId} không tồn tại trong hệ thống" });
                }
                System.Diagnostics.Debug.WriteLine($"[Cart] UserId {userId} verified in Users table");

                // Kiểm tra xem sản phẩm đã có trong giỏ chưa
                var existingItem = db.CartItems
                    .FirstOrDefault(c => c.UserId == userId && c.ProductId == productId);

                if (existingItem != null)
                {
                    // Nếu đã có, tăng số lượng
                    existingItem.Quantity += quantity;
                    existingItem.UpdatedAt = DateTime.Now;
                    System.Diagnostics.Debug.WriteLine($"[Cart] Updated existing item, new quantity: {existingItem.Quantity}");
                }
                else
                {
                    // Nếu chưa có, tạo mới
                    var newItem = new CartItem
                    {
                        UserId = userId,
                        ProductId = productId,
                        ProductName = productName ?? "Unknown",
                        Price = price,
                        ProductImage = productImage ?? "",
                        Quantity = quantity,
                        CreatedAt = DateTime.Now,
                        UpdatedAt = DateTime.Now
                    };
                    db.CartItems.Add(newItem);
                    System.Diagnostics.Debug.WriteLine($"[Cart] Added new item: {productName}");
                }

                try
                {
                    int saved = db.SaveChanges();
                    System.Diagnostics.Debug.WriteLine($"[Cart] Saved changes: {saved} records affected");
                    
                    // Verify item was saved
                    var verifyItem = db.CartItems
                        .FirstOrDefault(c => c.UserId == userId && c.ProductId == productId);
                    if (verifyItem == null)
                    {
                        System.Diagnostics.Debug.WriteLine($"[Cart] WARNING: Item was not saved to database!");
                        return Json(new { success = false, message = "Không thể lưu vào database. Vui lòng thử lại." });
                    }
                    System.Diagnostics.Debug.WriteLine($"[Cart] Verified: Item saved with Id={verifyItem.Id}, Quantity={verifyItem.Quantity}");
                }
                catch (System.Data.Entity.Validation.DbEntityValidationException dbEx)
                {
                    var errorMessages = dbEx.EntityValidationErrors
                        .SelectMany(x => x.ValidationErrors)
                        .Select(x => x.ErrorMessage);
                    var fullErrorMessage = string.Join("; ", errorMessages);
                    System.Diagnostics.Debug.WriteLine($"[Cart] Validation Error: {fullErrorMessage}");
                    return Json(new { success = false, message = $"Lỗi validation: {fullErrorMessage}" });
                }
                catch (System.Data.Entity.Infrastructure.DbUpdateException dbEx)
                {
                    System.Diagnostics.Debug.WriteLine($"[Cart] DbUpdateException: {dbEx.Message}");
                    if (dbEx.InnerException != null)
                    {
                        System.Diagnostics.Debug.WriteLine($"[Cart] Inner Exception: {dbEx.InnerException.Message}");
                    }
                    return Json(new { success = false, message = $"Lỗi database: {dbEx.Message}" });
                }

                return Json(new { success = true, message = "Đã thêm vào giỏ hàng" });
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"[Cart] Exception in AddItem: {ex.Message}\n{ex.StackTrace}");
                if (ex.InnerException != null)
                {
                    System.Diagnostics.Debug.WriteLine($"[Cart] Inner Exception: {ex.InnerException.Message}");
                }
                return Json(new { success = false, message = $"Lỗi: {ex.Message}" });
            }
        }

        // POST: Cart/UpdateItem - Cập nhật số lượng sản phẩm
        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult UpdateItem(string productId, int quantity)
        {
            try
            {
                if (db == null)
                {
                    return Json(new { success = false, message = "Lỗi kết nối database" });
                }

                var userIdObj = Session["UserId"];
                if (userIdObj == null)
                {
                    return Json(new { success = false, message = "Vui lòng đăng nhập" });
                }

                int userId = Convert.ToInt32(userIdObj);

                var item = db.CartItems
                    .FirstOrDefault(c => c.UserId == userId && c.ProductId == productId);

                if (item == null)
                {
                    return Json(new { success = false, message = "Không tìm thấy sản phẩm trong giỏ hàng" });
                }

                if (quantity <= 0)
                {
                    // Xóa nếu số lượng <= 0
                    System.Diagnostics.Debug.WriteLine($"[Cart] UpdateItem - Quantity={quantity} <= 0, XÓA dòng: UserId={userId}, ProductId={productId}");
                    db.CartItems.Remove(item);
                }
                else
                {
                    // Chỉ cập nhật cột Quantity
                    System.Diagnostics.Debug.WriteLine($"[Cart] UpdateItem - Cập nhật Quantity: UserId={userId}, ProductId={productId}, OldQty={item.Quantity}, NewQty={quantity}");
                    item.Quantity = quantity;
                    item.UpdatedAt = DateTime.Now;
                }

                db.SaveChanges();
                System.Diagnostics.Debug.WriteLine($"[Cart] UpdateItem - Đã lưu thành công vào SQL");

                return Json(new { success = true, message = "Đã cập nhật giỏ hàng" });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = $"Lỗi: {ex.Message}" });
            }
        }

        // POST: Cart/RemoveItem - Xóa sản phẩm khỏi giỏ hàng
        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult RemoveItem(string productId)
        {
            try
            {
                if (db == null)
                {
                    return Json(new { success = false, message = "Lỗi kết nối database" });
                }

                var userIdObj = Session["UserId"];
                if (userIdObj == null)
                {
                    return Json(new { success = false, message = "Vui lòng đăng nhập" });
                }

                int userId = Convert.ToInt32(userIdObj);

                var item = db.CartItems
                    .FirstOrDefault(c => c.UserId == userId && c.ProductId == productId);

                if (item != null)
                {
                    System.Diagnostics.Debug.WriteLine($"[Cart] RemoveItem - Xóa dòng: UserId={userId}, ProductId={productId}, Id={item.Id}, Quantity={item.Quantity}");
                    db.CartItems.Remove(item);
                    int saved = db.SaveChanges();
                    System.Diagnostics.Debug.WriteLine($"[Cart] RemoveItem - Đã xóa thành công dòng Id={item.Id} khỏi SQL (saved={saved})");
                    
                    // Verify đã xóa
                    var verify = db.CartItems.FirstOrDefault(c => c.Id == item.Id);
                    if (verify != null)
                    {
                        System.Diagnostics.Debug.WriteLine($"[Cart] RemoveItem - WARNING: Dòng Id={item.Id} vẫn còn trong SQL sau khi xóa!");
                    }
                    else
                    {
                        System.Diagnostics.Debug.WriteLine($"[Cart] RemoveItem - Verified: Dòng Id={item.Id} đã bị xóa khỏi SQL");
                    }
                }
                else
                {
                    System.Diagnostics.Debug.WriteLine($"[Cart] RemoveItem - Không tìm thấy item để xóa: UserId={userId}, ProductId={productId}");
                }

                return Json(new { success = true, message = "Đã xóa khỏi giỏ hàng" });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = $"Lỗi: {ex.Message}" });
            }
        }

        // POST: Cart/ClearCart - Xóa toàn bộ giỏ hàng
        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult ClearCart()
        {
            try
            {
                if (db == null)
                {
                    return Json(new { success = false, message = "Lỗi kết nối database" });
                }

                var userIdObj = Session["UserId"];
                if (userIdObj == null)
                {
                    return Json(new { success = false, message = "Vui lòng đăng nhập" });
                }

                int userId = Convert.ToInt32(userIdObj);

                var items = db.CartItems.Where(c => c.UserId == userId).ToList();
                int count = items.Count;
                
                System.Diagnostics.Debug.WriteLine($"[Cart] ClearCart - Xóa {count} items cho UserId={userId}");
                
                if (count > 0)
                {
                    db.CartItems.RemoveRange(items);
                    db.SaveChanges();
                    System.Diagnostics.Debug.WriteLine($"[Cart] ClearCart - Đã xóa thành công {count} dòng khỏi SQL");
                }
                else
                {
                    System.Diagnostics.Debug.WriteLine($"[Cart] ClearCart - Không có items để xóa cho UserId={userId}");
                }

                return Json(new { success = true, message = $"Đã xóa {count} sản phẩm khỏi giỏ hàng" });
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"[Cart] ClearCart - Lỗi: {ex.Message}");
                if (ex.InnerException != null)
                {
                    System.Diagnostics.Debug.WriteLine($"[Cart] ClearCart - Inner Exception: {ex.InnerException.Message}");
                }
                return Json(new { success = false, message = $"Lỗi: {ex.Message}" });
            }
        }

        protected override void OnActionExecuted(ActionExecutedContext filterContext)
        {
            // KHÔNG dispose db ở đây vì có thể cần dùng lại trong cùng request
            // Chỉ dispose khi controller bị dispose hoàn toàn
            base.OnActionExecuted(filterContext);
        }

        protected override void Dispose(bool disposing)
        {
            if (disposing)
            {
                db?.Dispose();
            }
            base.Dispose(disposing);
        }
    }
}

