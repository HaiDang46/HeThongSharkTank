using System;
using System.Linq;
using System.Web.Mvc;
using WebSharkTank.Models;
using WebSharkTank.Helpers;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System.Collections.Generic;

namespace WebSharkTank.Controllers
{
    public class AdminController : Controller
    {
        private AppDbContext db = new AppDbContext();

        // Helper method để kiểm tra đăng nhập admin (Role >= 50)
        private bool IsAdminLoggedIn()
        {
            if (Session["UserId"] == null)
            {
                return false;
            }

            int userId = (int)Session["UserId"];
            var user = db.Users.FirstOrDefault(u => u.Id == userId);
            
            // Kiểm tra Role từ database: Role >= 50 là admin
            return user != null && user.Role >= 50;
        }

        // Helper method để kiểm tra có quyền cấp quyền (chỉ Role = 99)
        private bool CanManageRoles()
        {
            if (Session["UserId"] == null)
            {
                return false;
            }

            int userId = (int)Session["UserId"];
            var user = db.Users.FirstOrDefault(u => u.Id == userId);
            
            // Chỉ Role = 99 mới có quyền cấp quyền
            return user != null && user.Role == 99;
        }

        // GET: Admin/Orders
        public ActionResult Orders()
        {
            if (!IsAdminLoggedIn())
            {
                return RedirectToAction("Login");
            }
            
            // Lấy danh sách đơn hàng kèm order items
            var orders = db.Orders
                .OrderByDescending(o => o.CreatedAt)
                .ToList();

            var ordersWithItems = new List<OrderWithItemsViewModel>();
            foreach (var order in orders)
            {
                var orderItems = db.OrderItems
                    .Where(oi => oi.OrderId == order.Id)
                    .ToList();

                // Lấy thông tin user
                var user = db.Users.FirstOrDefault(u => u.Id == order.UserId);
                string userName = user != null ? user.Name : "N/A";
                string userEmail = user != null ? user.Email : "N/A";

                // Lấy thông tin địa chỉ
                var address = db.Addresses.FirstOrDefault(a => a.Id == order.AddressId);
                string fullAddress = "";
                if (address != null)
                {
                    var addressParts = new List<string>();
                    if (!string.IsNullOrEmpty(address.StreetAddress)) addressParts.Add(address.StreetAddress);
                    if (!string.IsNullOrEmpty(address.Ward)) addressParts.Add(address.Ward);
                    if (!string.IsNullOrEmpty(address.District)) addressParts.Add(address.District);
                    if (!string.IsNullOrEmpty(address.Province)) addressParts.Add(address.Province);
                    fullAddress = string.Join(", ", addressParts);
                }

                ordersWithItems.Add(new OrderWithItemsViewModel
                {
                    Order = order,
                    OrderItems = orderItems,
                    FullAddress = fullAddress,
                    UserName = userName,
                    UserEmail = userEmail
                });
            }

            ViewBag.Orders = ordersWithItems;
            return View();
        }

        // POST: Admin/UpdateOrderStatus
        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult UpdateOrderStatus(int orderId, string status)
        {
            System.Diagnostics.Debug.WriteLine($"[Admin] UpdateOrderStatus called - OrderId: {orderId}, Status: {status}");
            
            if (!IsAdminLoggedIn())
            {
                System.Diagnostics.Debug.WriteLine("[Admin] User not logged in");
                return Json(new { success = false, message = "Vui lòng đăng nhập" });
            }
            
            try
            {
                var order = db.Orders.Find(orderId);
                if (order == null)
                {
                    System.Diagnostics.Debug.WriteLine($"[Admin] Order not found - OrderId: {orderId}");
                    return Json(new { success = false, message = "Không tìm thấy đơn hàng" });
                }

                System.Diagnostics.Debug.WriteLine($"[Admin] Order found - Current Status: {order.Status}, New Status: {status}");

                // Validate status
                var validStatuses = new[] { "Pending", "Processing", "Shipped", "Delivered", "Cancelled" };
                if (!validStatuses.Contains(status))
                {
                    System.Diagnostics.Debug.WriteLine($"[Admin] Invalid status: {status}");
                    return Json(new { success = false, message = "Trạng thái không hợp lệ" });
                }

                // Lưu trạng thái cũ để log
                var oldStatus = order.Status;
                
                order.Status = status;
                order.UpdatedAt = DateTime.Now;
                
                System.Diagnostics.Debug.WriteLine($"[Admin] Updating order - OrderId: {order.Id}, OldStatus: {oldStatus}, NewStatus: {status}");
                
                db.SaveChanges();

                System.Diagnostics.Debug.WriteLine($"[Admin] ✅ Order status updated successfully - OrderId: {order.Id}, Status: {order.Status}");

                return Json(new { success = true, message = "Cập nhật trạng thái đơn hàng thành công!" });
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"[Admin] ❌ Update Order Status Error: {ex.Message}");
                System.Diagnostics.Debug.WriteLine($"[Admin] Stack Trace: {ex.StackTrace}");
                if (ex.InnerException != null)
                {
                    System.Diagnostics.Debug.WriteLine($"[Admin] Inner Exception: {ex.InnerException.Message}");
                }
                return Json(new { success = false, message = "Có lỗi xảy ra: " + ex.Message });
            }
        }

        // GET: Admin/GetOrderDetail
        [HttpGet]
        public ActionResult GetOrderDetail(int? id)
        {
            if (!id.HasValue || id.Value <= 0)
            {
                System.Diagnostics.Debug.WriteLine("[Admin] Invalid orderId parameter");
                return Json(new { success = false, message = "Thiếu thông tin đơn hàng" }, JsonRequestBehavior.AllowGet);
            }
            
            int orderId = id.Value;
            System.Diagnostics.Debug.WriteLine($"[Admin] GetOrderDetail called - OrderId: {orderId}");
            
            if (!IsAdminLoggedIn())
            {
                System.Diagnostics.Debug.WriteLine("[Admin] User not logged in");
                return Json(new { success = false, message = "Vui lòng đăng nhập" }, JsonRequestBehavior.AllowGet);
            }
            try
            {
                var order = db.Orders.Find(orderId);
                if (order == null)
                {
                    System.Diagnostics.Debug.WriteLine($"[Admin] Order not found - OrderId: {orderId}");
                    return Json(new { success = false, message = "Không tìm thấy đơn hàng" }, JsonRequestBehavior.AllowGet);
                }
                
                System.Diagnostics.Debug.WriteLine($"[Admin] Order found - OrderId: {order.Id}, UserId: {order.UserId}, Status: {order.Status}");

                var orderItems = db.OrderItems
                    .Where(oi => oi.OrderId == order.Id)
                    .ToList();

                var user = db.Users.FirstOrDefault(u => u.Id == order.UserId);
                string userName = user != null ? user.Name : "N/A";
                string userEmail = user != null ? user.Email : "N/A";

                var address = db.Addresses.FirstOrDefault(a => a.Id == order.AddressId);
                string fullAddress = "";
                string addressName = "";
                string addressPhone = "";
                if (address != null)
                {
                    addressName = address.Name ?? "";
                    addressPhone = address.Phone ?? "";
                    var addressParts = new List<string>();
                    if (!string.IsNullOrEmpty(address.StreetAddress)) addressParts.Add(address.StreetAddress);
                    if (!string.IsNullOrEmpty(address.Ward)) addressParts.Add(address.Ward);
                    if (!string.IsNullOrEmpty(address.District)) addressParts.Add(address.District);
                    if (!string.IsNullOrEmpty(address.Province)) addressParts.Add(address.Province);
                    fullAddress = string.Join(", ", addressParts);
                }

                string statusText = "";
                switch (order.Status)
                {
                    case "Pending":
                        statusText = "Chờ xử lý";
                        break;
                    case "Processing":
                        statusText = "Đang xử lý";
                        break;
                    case "Shipped":
                        statusText = "Đã giao hàng";
                        break;
                    case "Delivered":
                        statusText = "Đã nhận hàng";
                        break;
                    case "Cancelled":
                        statusText = "Đã hủy";
                        break;
                    default:
                        statusText = order.Status;
                        break;
                }

                var result = new
                {
                    success = true,
                    order = new
                    {
                        id = order.Id,
                        userId = order.UserId,
                        userName = userName,
                        userEmail = userEmail,
                        addressName = addressName,
                        addressPhone = addressPhone,
                        fullAddress = fullAddress,
                        paymentMethod = order.PaymentMethod,
                        totalAmount = order.TotalAmount,
                        shippingFee = order.ShippingFee,
                        status = order.Status,
                        statusText = statusText,
                        createdAt = order.CreatedAt.ToString("dd/MM/yyyy HH:mm"),
                        updatedAt = order.UpdatedAt.HasValue ? order.UpdatedAt.Value.ToString("dd/MM/yyyy HH:mm") : ""
                    },
                    orderItems = orderItems.Select(oi => new
                    {
                        id = oi.Id,
                        productId = oi.ProductId,
                        productName = oi.ProductName,
                        price = oi.Price,
                        quantity = oi.Quantity,
                        productImage = oi.ProductImage,
                        subtotal = oi.Price * oi.Quantity
                    }).ToList()
                };
                
                System.Diagnostics.Debug.WriteLine($"[Admin] ✅ GetOrderDetail success - OrderId: {order.Id}, Items count: {orderItems.Count}");
                
                return Json(result, JsonRequestBehavior.AllowGet);
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"[Admin] ❌ Get Order Detail Error: {ex.Message}");
                System.Diagnostics.Debug.WriteLine($"[Admin] Stack Trace: {ex.StackTrace}");
                if (ex.InnerException != null)
                {
                    System.Diagnostics.Debug.WriteLine($"[Admin] Inner Exception: {ex.InnerException.Message}");
                }
                return Json(new { success = false, message = "Có lỗi xảy ra: " + ex.Message }, JsonRequestBehavior.AllowGet);
            }
        }

        // GET: Admin/Customers
        public ActionResult Customers()
        {
            if (!IsAdminLoggedIn())
            {
                return RedirectToAction("Login");
            }
            var customers = db.Users.OrderByDescending(u => u.CreatedAt).ToList();
            return View(customers);
        }

        // GET: Admin/CreateCustomer
        public ActionResult CreateCustomer()
        {
            if (!IsAdminLoggedIn())
            {
                return RedirectToAction("Login");
            }
            return View();
        }

        // POST: Admin/CreateCustomer
        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult CreateCustomer(string name, string email, string password, string confirmPassword)
        {
            if (!IsAdminLoggedIn())
            {
                if (Request.IsAjaxRequest())
                {
                    return Json(new { success = false, message = "Vui lòng đăng nhập" });
                }
                return RedirectToAction("Login");
            }
            try
            {
                if (string.IsNullOrEmpty(name) || string.IsNullOrEmpty(email) || string.IsNullOrEmpty(password))
                {
                    if (Request.IsAjaxRequest())
                    {
                        return Json(new { success = false, message = "Vui lòng nhập đầy đủ thông tin" });
                    }
                    ModelState.AddModelError("", "Vui lòng nhập đầy đủ thông tin");
                    return View();
                }

                if (password != confirmPassword)
                {
                    if (Request.IsAjaxRequest())
                    {
                        return Json(new { success = false, message = "Mật khẩu nhập lại không khớp" });
                    }
                    ModelState.AddModelError("", "Mật khẩu nhập lại không khớp");
                    return View();
                }

                if (password.Length < 6)
                {
                    if (Request.IsAjaxRequest())
                    {
                        return Json(new { success = false, message = "Mật khẩu phải có ít nhất 6 ký tự" });
                    }
                    ModelState.AddModelError("", "Mật khẩu phải có ít nhất 6 ký tự");
                    return View();
                }

                email = email.ToLower().Trim();
                if (db.Users.Any(u => u.Email == email))
                {
                    if (Request.IsAjaxRequest())
                    {
                        return Json(new { success = false, message = "Email đã được sử dụng" });
                    }
                    ModelState.AddModelError("", "Email đã được sử dụng");
                    return View();
                }

                // Hash password
                string passwordHash = PasswordHelper.HashPassword(password);

                // Create user
                var user = new User
                {
                    Name = name.Trim(),
                    Email = email,
                    PasswordHash = passwordHash,
                    CreatedAt = DateTime.Now
                };

                db.Users.Add(user);
                db.SaveChanges();

                if (Request.IsAjaxRequest())
                {
                    return Json(new { success = true, message = "Tạo tài khoản thành công!", redirectUrl = Url.Action("Customers", "Admin") });
                }
                return RedirectToAction("Customers");
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Create Customer Error: {ex.Message}");
                if (Request.IsAjaxRequest())
                {
                    return Json(new { success = false, message = "Có lỗi xảy ra: " + ex.Message });
                }
                ModelState.AddModelError("", "Có lỗi xảy ra: " + ex.Message);
                return View();
            }
        }

        // POST: Admin/DeleteCustomer
        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult DeleteCustomer(int id)
        {
            if (!IsAdminLoggedIn())
            {
                if (Request.IsAjaxRequest())
                {
                    return Json(new { success = false, message = "Vui lòng đăng nhập" });
                }
                return RedirectToAction("Login");
            }
            try
            {
                var customer = db.Users.Find(id);
                if (customer != null)
                {
                    db.Users.Remove(customer);
                    db.SaveChanges();

                    if (Request.IsAjaxRequest())
                    {
                        return Json(new { success = true, message = "Đã xóa khách hàng thành công" });
                    }
                }
                else
                {
                    if (Request.IsAjaxRequest())
                    {
                        return Json(new { success = false, message = "Không tìm thấy khách hàng" });
                    }
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Delete Customer Error: {ex.Message}");
                if (Request.IsAjaxRequest())
                {
                    return Json(new { success = false, message = "Có lỗi xảy ra: " + ex.Message });
                }
            }
            return RedirectToAction("Customers");
        }

        // POST: Admin/ChangeCustomerPassword
        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult ChangeCustomerPassword(int id, string newPassword, string confirmPassword)
        {
            if (!IsAdminLoggedIn())
            {
                return Json(new { success = false, message = "Vui lòng đăng nhập" });
            }
            try
            {
                if (string.IsNullOrEmpty(newPassword))
                {
                    return Json(new { success = false, message = "Vui lòng nhập mật khẩu mới" });
                }

                if (newPassword.Length < 6)
                {
                    return Json(new { success = false, message = "Mật khẩu phải có ít nhất 6 ký tự" });
                }

                if (newPassword != confirmPassword)
                {
                    return Json(new { success = false, message = "Mật khẩu nhập lại không khớp" });
                }

                var customer = db.Users.Find(id);
                if (customer == null)
                {
                    return Json(new { success = false, message = "Không tìm thấy khách hàng" });
                }

                // Hash password mới
                string passwordHash = PasswordHelper.HashPassword(newPassword);
                customer.PasswordHash = passwordHash;
                customer.UpdatedAt = DateTime.Now;
                db.SaveChanges();

                return Json(new { success = true, message = "Đã đổi mật khẩu thành công" });
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Change Customer Password Error: {ex.Message}");
                return Json(new { success = false, message = "Có lỗi xảy ra: " + ex.Message });
            }
        }

        // GET: Admin/Login
        public ActionResult Login()
        {
            // Nếu đã đăng nhập, redirect về dashboard
            if (IsAdminLoggedIn())
            {
                return RedirectToAction("Dashboard");
            }
            return View();
        }

        // POST: Admin/Login
        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult Login(string email, string password)
        {
            try
            {
                if (string.IsNullOrEmpty(email) || string.IsNullOrEmpty(password))
                {
                    return Json(new { success = false, message = "Vui lòng nhập đầy đủ thông tin" });
                }

                if (db == null)
                {
                    return Json(new { success = false, message = "Lỗi kết nối database" });
                }

                var user = db.Users.FirstOrDefault(u => u.Email == email.ToLower().Trim());
                if (user == null)
                {
                    return Json(new { success = false, message = "Email hoặc mật khẩu không đúng" });
                }

                // Verify password
                bool isValidPassword = PasswordHelper.VerifyPassword(password, user.PasswordHash);
                if (!isValidPassword)
                {
                    return Json(new { success = false, message = "Email hoặc mật khẩu không đúng" });
                }

                // Kiểm tra quyền admin: Role phải >= 50
                if (user.Role < 50)
                {
                    return Json(new { success = false, message = "Bạn không có quyền truy cập trang quản trị" });
                }

                // Set session
                Session["UserId"] = user.Id;
                Session["UserName"] = user.Name;
                Session["UserEmail"] = user.Email;
                Session["UserRole"] = user.Role; // Lưu Role vào session để tiện sử dụng

                // Cập nhật thời gian đăng nhập cuối
                user.LastLoginAt = DateTime.Now;
                db.SaveChanges();

                return Json(new { 
                    success = true, 
                    message = "Đăng nhập thành công!", 
                    userName = user.Name,
                    redirectUrl = Url.Action("Dashboard", "Admin") 
                });
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Admin Login Error: {ex.Message}");
                return Json(new { success = false, message = "Có lỗi xảy ra khi đăng nhập" });
            }
        }

        // GET: Admin/ForgotPassword
        public ActionResult ForgotPassword()
        {
            return View();
        }

        // POST: Admin/ForgotPassword
        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult ForgotPassword(string email)
        {
            try
            {
                if (string.IsNullOrEmpty(email))
                {
                    return Json(new { success = false, message = "Vui lòng nhập email" });
                }

                if (db == null)
                {
                    return Json(new { success = false, message = "Lỗi kết nối database" });
                }

                var user = db.Users.FirstOrDefault(u => u.Email == email.ToLower().Trim());
                if (user == null)
                {
                    // Không tiết lộ email có tồn tại hay không vì lý do bảo mật
                    return Json(new { 
                        success = true, 
                        message = "Nếu email tồn tại trong hệ thống, chúng tôi đã gửi link reset mật khẩu đến email của bạn!" 
                    });
                }

                // TODO: Implement gửi email reset password
                return Json(new { 
                    success = true, 
                    message = "Chúng tôi đã gửi link reset mật khẩu đến email của bạn!" 
                });
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"ForgotPassword Error: {ex.Message}");
                return Json(new { success = false, message = "Có lỗi xảy ra" });
            }
        }

        // GET: Admin/Dashboard
        public ActionResult Dashboard()
        {
            if (!IsAdminLoggedIn())
            {
                return RedirectToAction("Login");
            }

            // Lấy số lượng sản phẩm
            ViewBag.TotalProducts = db.Products.Count();
            
            // Lấy tổng số khách hàng
            ViewBag.TotalCustomers = db.Users.Count();
            
            // Lấy tổng số đơn hàng (trong tháng hiện tại)
            var currentMonth = DateTime.Now.Month;
            var currentYear = DateTime.Now.Year;
            ViewBag.TotalOrders = db.Orders
                .Where(o => o.CreatedAt.Month == currentMonth && o.CreatedAt.Year == currentYear)
                .Count();
            
            // Lấy tổng số đơn hàng (tất cả)
            ViewBag.TotalOrdersAll = db.Orders.Count();
            
            // Lấy danh sách đơn hàng gần đây (5 đơn hàng mới nhất) từ bảng Orders với thông tin khách hàng từ bảng Users
            var recentOrders = db.Orders
                .OrderByDescending(o => o.CreatedAt)
                .Take(5)
                .ToList();
            
            System.Diagnostics.Debug.WriteLine($"[Dashboard] Found {recentOrders.Count} recent orders from Orders table");
            
            var recentOrdersWithUsers = new List<OrderWithItemsViewModel>();
            foreach (var order in recentOrders)
            {
                var user = db.Users.FirstOrDefault(u => u.Id == order.UserId);
                string userName = user != null ? user.Name : "N/A";
                
                System.Diagnostics.Debug.WriteLine($"[Dashboard] Order #{order.Id} - User: {userName}, Amount: {order.TotalAmount}, Status: {order.Status}");
                
                recentOrdersWithUsers.Add(new OrderWithItemsViewModel
                {
                    Order = order,
                    OrderItems = new List<OrderItem>(), // Không cần load items cho dashboard
                    FullAddress = "",
                    UserName = userName,
                    UserEmail = user != null ? user.Email : "N/A"
                });
            }
            
            ViewBag.RecentOrders = recentOrdersWithUsers;
            
            // Lấy danh sách khách hàng mới (5 khách hàng mới nhất) từ bảng Users với số điện thoại từ bảng Addresses
            var recentCustomers = db.Users
                .OrderByDescending(u => u.CreatedAt)
                .Take(5)
                .ToList();
            
            System.Diagnostics.Debug.WriteLine($"[Dashboard] Found {recentCustomers.Count} recent customers from Users table");
            
            var recentCustomersWithPhone = new List<RecentCustomerViewModel>();
            foreach (var user in recentCustomers)
            {
                // Lấy số điện thoại từ bảng Addresses
                var address = db.Addresses
                    .Where(a => a.UserId == user.Id)
                    .OrderByDescending(a => a.IsDefault)
                    .ThenByDescending(a => a.CreatedAt)
                    .FirstOrDefault();
                
                string phone = address != null ? address.Phone : "";
                
                System.Diagnostics.Debug.WriteLine($"[Dashboard] Customer #{user.Id} - Name: {user.Name}, Email: {user.Email}, Phone: {phone}");
                
                recentCustomersWithPhone.Add(new RecentCustomerViewModel
                {
                    User = user,
                    Phone = phone
                });
            }
            
            ViewBag.RecentCustomers = recentCustomersWithPhone;
            
            return View();
        }

        // GET: Admin/Users - Quản lý nhân viên
        public ActionResult Users()
        {
            if (!IsAdminLoggedIn())
            {
                return RedirectToAction("Login");
            }

            // Lấy danh sách tất cả users
            var users = db.Users
                .OrderByDescending(u => u.CreatedAt)
                .ToList();

            ViewBag.Users = users;
            ViewBag.CanManageRoles = CanManageRoles(); // Chỉ Role 99 mới có quyền cấp quyền
            ViewBag.ActiveMenu = "Users";

            return View();
        }

        // POST: Admin/ResetUserPassword - Reset mật khẩu của user
        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult ResetUserPassword(int userId, string newPassword)
        {
            try
            {
                System.Diagnostics.Debug.WriteLine($"[ResetUserPassword] Called - UserId: {userId}, HasPassword: {!string.IsNullOrEmpty(newPassword)}");
                
                // Chỉ Role 99 mới có quyền reset password
                if (!CanManageRoles())
                {
                    System.Diagnostics.Debug.WriteLine("[ResetUserPassword] User không có quyền");
                    return Json(new { success = false, message = "Bạn không có quyền reset mật khẩu" });
                }

                if (!IsAdminLoggedIn())
                {
                    System.Diagnostics.Debug.WriteLine("[ResetUserPassword] User chưa đăng nhập");
                    return Json(new { success = false, message = "Vui lòng đăng nhập" });
                }

                if (string.IsNullOrEmpty(newPassword) || newPassword.Length < 6)
                {
                    System.Diagnostics.Debug.WriteLine("[ResetUserPassword] Mật khẩu không hợp lệ");
                    return Json(new { success = false, message = "Mật khẩu mới phải có ít nhất 6 ký tự" });
                }

                var user = db.Users.FirstOrDefault(u => u.Id == userId);
                if (user == null)
                {
                    System.Diagnostics.Debug.WriteLine($"[ResetUserPassword] Không tìm thấy user với Id: {userId}");
                    return Json(new { success = false, message = "Không tìm thấy user" });
                }

                System.Diagnostics.Debug.WriteLine($"[ResetUserPassword] Tìm thấy user: {user.Name}, Email: {user.Email}");

                // Hash password mới
                string passwordHash = PasswordHelper.HashPassword(newPassword);
                user.PasswordHash = passwordHash;
                user.UpdatedAt = DateTime.Now;
                db.SaveChanges();

                System.Diagnostics.Debug.WriteLine($"[ResetUserPassword] ✅ Reset thành công cho user: {user.Name}");

                return Json(new { 
                    success = true, 
                    message = $"Đã reset mật khẩu cho {user.Name} thành công!" 
                }, JsonRequestBehavior.AllowGet);
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"[ResetUserPassword] ❌ Error: {ex.Message}");
                System.Diagnostics.Debug.WriteLine($"[ResetUserPassword] Stack Trace: {ex.StackTrace}");
                if (ex.InnerException != null)
                {
                    System.Diagnostics.Debug.WriteLine($"[ResetUserPassword] Inner Exception: {ex.InnerException.Message}");
                }
                return Json(new { success = false, message = "Có lỗi xảy ra: " + ex.Message }, JsonRequestBehavior.AllowGet);
            }
        }

        // POST: Admin/UpdateUserRole - Cập nhật role của user
        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult UpdateUserRole(int userId, int role)
        {
            try
            {
                // Chỉ Role 99 mới có quyền cấp quyền
                if (!CanManageRoles())
                {
                    return Json(new { success = false, message = "Bạn không có quyền cấp quyền cho người khác" });
                }

                if (!IsAdminLoggedIn())
                {
                    return Json(new { success = false, message = "Vui lòng đăng nhập" });
                }

                // Validate role: chỉ cho phép 0, 50, 99
                if (role != 0 && role != 50 && role != 99)
                {
                    return Json(new { success = false, message = "Role không hợp lệ. Chỉ cho phép: 0 (User), 50 (Admin), 99 (Super Admin)" });
                }

                var user = db.Users.FirstOrDefault(u => u.Id == userId);
                if (user == null)
                {
                    return Json(new { success = false, message = "Không tìm thấy user" });
                }

                // Không cho phép tự thay đổi role của chính mình
                int currentUserId = (int)Session["UserId"];
                if (userId == currentUserId)
                {
                    return Json(new { success = false, message = "Bạn không thể thay đổi quyền của chính mình" });
                }

                // Không cho phép thay đổi role của user khác thành 99 (chỉ có thể tạo 99 từ bên ngoài)
                // Nhưng ở đây cho phép để admin có thể cấp quyền
                user.Role = role;
                user.UpdatedAt = DateTime.Now;
                db.SaveChanges();

                string roleText = role == 99 ? "Super Admin (Full quyền)" : (role == 50 ? "Admin (Không cấp quyền)" : "User");
                return Json(new { 
                    success = true, 
                    message = $"Đã cập nhật quyền của {user.Name} thành {roleText}" 
                });
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"UpdateUserRole Error: {ex.Message}");
                return Json(new { success = false, message = "Có lỗi xảy ra: " + ex.Message });
            }
        }

        // POST: Admin/Logout
        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult Logout()
        {
            Session.Clear();
            Session.Abandon();
            return RedirectToAction("Login");
        }

        // GET: Admin
        public ActionResult Index()
        {
            if (!IsAdminLoggedIn())
            {
                return RedirectToAction("Login");
            }
            var products = db.Products.OrderByDescending(p => p.CreatedAt).ToList();
            return View(products);
        }

        // GET: Admin/Create
        public ActionResult Create()
        {
            if (!IsAdminLoggedIn())
            {
                return RedirectToAction("Login");
            }
            return View(new Product());
        }

        // POST: Admin/Create
        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult Create(Product product, string imagesJson, string tagsJson)
        {
            if (!IsAdminLoggedIn())
            {
                return Json(new { success = false, message = "Vui lòng đăng nhập" });
            }
            try
            {
                if (ModelState.IsValid)
                {
                    // Xử lý Images và Tags
                    if (!string.IsNullOrEmpty(imagesJson))
                    {
                        try
                        {
                            var images = JsonConvert.DeserializeObject<List<string>>(imagesJson);
                            product.Images = JsonConvert.SerializeObject(images);
                        }
                        catch
                        {
                            product.Images = imagesJson;
                        }
                    }

                    if (!string.IsNullOrEmpty(tagsJson))
                    {
                        try
                        {
                            var tags = JsonConvert.DeserializeObject<List<string>>(tagsJson);
                            product.Tags = JsonConvert.SerializeObject(tags);
                        }
                        catch
                        {
                            product.Tags = tagsJson;
                        }
                    }

                    product.CreatedAt = DateTime.Now;
                    db.Products.Add(product);
                    db.SaveChanges();
                    return RedirectToAction("Index");
                }
            }
            catch (Exception ex)
            {
                ModelState.AddModelError("", "Lỗi: " + ex.Message);
            }
            return View(product);
        }

        // GET: Admin/Edit/5
        public ActionResult Edit(int? id)
        {
            if (!IsAdminLoggedIn())
            {
                return RedirectToAction("Login");
            }
            if (id == null)
            {
                return HttpNotFound();
            }
            var product = db.Products.Find(id);
            if (product == null)
            {
                return HttpNotFound();
            }
            return View(product);
        }

        // POST: Admin/Edit/5
        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult Edit(Product product, string imagesJson, string tagsJson, bool isAjax = false)
        {
            if (!IsAdminLoggedIn())
            {
                if (isAjax || Request.IsAjaxRequest())
                {
                    return Json(new { success = false, message = "Vui lòng đăng nhập" });
                }
                return RedirectToAction("Login");
            }
            try
            {
                // Kiểm tra Id
                if (product == null || product.Id == 0)
                {
                    if (isAjax || Request.IsAjaxRequest())
                    {
                        return Json(new { success = false, message = "Thiếu thông tin sản phẩm (Id)" });
                    }
                    return HttpNotFound();
                }

                var existing = db.Products.Find(product.Id);
                if (existing == null)
                {
                    if (isAjax || Request.IsAjaxRequest())
                    {
                        return Json(new { success = false, message = "Không tìm thấy sản phẩm" });
                    }
                    return HttpNotFound();
                }

                // Cập nhật thông tin cơ bản
                if (!string.IsNullOrEmpty(product.ProductId))
                {
                    existing.ProductId = product.ProductId;
                }
                if (!string.IsNullOrEmpty(product.Title))
                {
                    existing.Title = product.Title;
                }
                if (!string.IsNullOrEmpty(product.Price))
                {
                    existing.Price = product.Price;
                }
                if (product.Sold != null)
                {
                    existing.Sold = product.Sold;
                }
                if (!string.IsNullOrEmpty(product.Category))
                {
                    existing.Category = product.Category;
                }
                existing.UpdatedAt = DateTime.Now;

                // Chỉ cập nhật các trường khác nếu có
                if (!string.IsNullOrEmpty(product.Link))
                {
                    existing.Link = product.Link;
                }
                if (!string.IsNullOrEmpty(product.Image))
                {
                    existing.Image = product.Image;
                }
                if (!string.IsNullOrEmpty(product.OldPrice))
                {
                    existing.OldPrice = product.OldPrice;
                }
                if (!string.IsNullOrEmpty(product.Discount))
                {
                    existing.Discount = product.Discount;
                }
                if (!string.IsNullOrEmpty(product.Score))
                {
                    existing.Score = product.Score;
                }

                // Xử lý Images và Tags
                if (!string.IsNullOrEmpty(imagesJson))
                {
                    try
                    {
                        var images = JsonConvert.DeserializeObject<List<string>>(imagesJson);
                        existing.Images = JsonConvert.SerializeObject(images);
                    }
                    catch
                    {
                        existing.Images = imagesJson;
                    }
                }

                if (!string.IsNullOrEmpty(tagsJson))
                {
                    try
                    {
                        var tags = JsonConvert.DeserializeObject<List<string>>(tagsJson);
                        existing.Tags = JsonConvert.SerializeObject(tags);
                    }
                    catch
                    {
                        existing.Tags = tagsJson;
                    }
                }

                db.SaveChanges();

                if (isAjax || Request.IsAjaxRequest())
                {
                    return Json(new { success = true, message = "Cập nhật sản phẩm thành công!" });
                }
                return RedirectToAction("Index");
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Edit Product Error: {ex.Message}");
                System.Diagnostics.Debug.WriteLine($"Stack Trace: {ex.StackTrace}");
                if (isAjax || Request.IsAjaxRequest())
                {
                    return Json(new { success = false, message = "Có lỗi xảy ra: " + ex.Message + (ex.InnerException != null ? " - " + ex.InnerException.Message : "") });
                }
                ModelState.AddModelError("", "Lỗi: " + ex.Message);
            }
            if (isAjax || Request.IsAjaxRequest())
            {
                return Json(new { success = false, message = "Có lỗi xảy ra khi cập nhật" });
            }
            return View(product);
        }

        // GET: Admin/Delete/5
        public ActionResult Delete(int? id)
        {
            if (!IsAdminLoggedIn())
            {
                return RedirectToAction("Login");
            }
            if (id == null)
            {
                return HttpNotFound();
            }
            var product = db.Products.Find(id);
            if (product == null)
            {
                return HttpNotFound();
            }
            return View(product);
        }

        // POST: Admin/Delete/5
        [HttpPost, ActionName("Delete")]
        [ValidateAntiForgeryToken]
        public ActionResult DeleteConfirmed(int id)
        {
            if (!IsAdminLoggedIn())
            {
                if (Request.IsAjaxRequest())
                {
                    return Json(new { success = false, message = "Vui lòng đăng nhập" });
                }
                return RedirectToAction("Login");
            }
            try
            {
                var product = db.Products.Find(id);
                if (product != null)
                {
                    db.Products.Remove(product);
                    db.SaveChanges();
                    
                    if (Request.IsAjaxRequest())
                    {
                        return Json(new { success = true, message = "Đã xóa sản phẩm thành công" });
                    }
                }
                else
                {
                    if (Request.IsAjaxRequest())
                    {
                        return Json(new { success = false, message = "Không tìm thấy sản phẩm" });
                    }
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Delete Product Error: {ex.Message}");
                if (Request.IsAjaxRequest())
                {
                    return Json(new { success = false, message = "Có lỗi xảy ra: " + ex.Message });
                }
            }
            return RedirectToAction("Index");
        }

        // GET: Admin/Import
        public ActionResult Import()
        {
            if (!IsAdminLoggedIn())
            {
                return RedirectToAction("Login");
            }
            return View();
        }

        // GET: Admin/ImportDescriptions
        public ActionResult ImportDescriptions()
        {
            if (!IsAdminLoggedIn())
            {
                return RedirectToAction("Login");
            }
            return View();
        }

        // POST: Admin/ImportDescriptions
        [HttpPost]
        public ActionResult ImportDescriptionsData()
        {
            if (!IsAdminLoggedIn())
            {
                return Json(new { success = false, message = "Vui lòng đăng nhập" }, JsonRequestBehavior.AllowGet);
            }
            try
            {
                string jsonPath = Server.MapPath("~/App_Data/descriptions.json");
                if (!System.IO.File.Exists(jsonPath))
                {
                    return Json(new { success = false, message = "File descriptions.json không tồn tại!" }, JsonRequestBehavior.AllowGet);
                }

                string jsonContent = System.IO.File.ReadAllText(jsonPath);
                var descriptionsData = JsonConvert.DeserializeObject<Dictionary<string, List<string>>>(jsonContent);

                if (descriptionsData == null)
                {
                    return Json(new { success = false, message = "Không thể đọc dữ liệu từ descriptions.json" }, JsonRequestBehavior.AllowGet);
                }

                int importedCount = 0;
                int updatedCount = 0;

                foreach (var item in descriptionsData)
                {
                    string productId = item.Key;
                    if (string.IsNullOrEmpty(productId)) continue;

                    var existing = db.ProductDescriptions.FirstOrDefault(p => p.ProductId == productId);
                    string descriptionJson = JsonConvert.SerializeObject(item.Value);

                    if (existing != null)
                    {
                        existing.DescriptionHtml = descriptionJson;
                        existing.UpdatedAt = DateTime.Now;
                        updatedCount++;
                    }
                    else
                    {
                        var description = new ProductDescription
                        {
                            ProductId = productId,
                            DescriptionHtml = descriptionJson,
                            CreatedAt = DateTime.Now
                        };
                        db.ProductDescriptions.Add(description);
                        importedCount++;
                    }
                }

                db.SaveChanges();

                return Json(new
                {
                    success = true,
                    message = $"Import descriptions thành công! Mới: {importedCount}, Cập nhật: {updatedCount}"
                }, JsonRequestBehavior.AllowGet);
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = $"Lỗi: {ex.Message}" }, JsonRequestBehavior.AllowGet);
            }
        }

        // GET: Admin/ImportSpecs
        public ActionResult ImportSpecs()
        {
            if (!IsAdminLoggedIn())
            {
                return RedirectToAction("Login");
            }
            return View();
        }

        // POST: Admin/ImportSpecs
        [HttpPost]
        public ActionResult ImportSpecsData()
        {
            if (!IsAdminLoggedIn())
            {
                return Json(new { success = false, message = "Vui lòng đăng nhập" }, JsonRequestBehavior.AllowGet);
            }
            try
            {
                string jsonPath = Server.MapPath("~/App_Data/specs.json");
                if (!System.IO.File.Exists(jsonPath))
                {
                    return Json(new { success = false, message = "File specs.json không tồn tại!" }, JsonRequestBehavior.AllowGet);
                }

                string jsonContent = System.IO.File.ReadAllText(jsonPath);
                
                // Parse trực tiếp với JObject để xử lý cả string và array values
                JObject specsDataRaw = JObject.Parse(jsonContent);

                if (specsDataRaw == null)
                {
                    return Json(new { success = false, message = "Không thể đọc dữ liệu từ specs.json" }, JsonRequestBehavior.AllowGet);
                }

                int importedCount = 0;
                int updatedCount = 0;
                int errorCount = 0;
                List<string> errors = new List<string>();

                foreach (var item in specsDataRaw)
                {
                    string productId = item.Key;
                    if (string.IsNullOrEmpty(productId)) continue;

                    try
                    {
                        // Convert value thành Dictionary<string, string> để xử lý cả string và array
                        var specDict = new Dictionary<string, string>();
                        
                        if (item.Value is JObject jObj)
                        {
                            foreach (var prop in jObj.Properties())
                            {
                                // Xử lý giá trị: nếu là array thì convert thành string (join bằng ", ")
                                if (prop.Value is JArray jArray)
                                {
                                    var arrayValues = jArray.Select(x => x?.ToString() ?? "").ToList();
                                    specDict[prop.Name] = string.Join(", ", arrayValues);
                                }
                                else if (prop.Value is JValue jValue)
                                {
                                    specDict[prop.Name] = jValue?.ToString() ?? "";
                                }
                                else
                                {
                                    specDict[prop.Name] = prop.Value?.ToString() ?? "";
                                }
                            }
                        }

                        var existing = db.ProductSpecs.FirstOrDefault(p => p.ProductId == productId);
                        string specsJson = JsonConvert.SerializeObject(specDict);

                        if (existing != null)
                        {
                            existing.SpecsJson = specsJson;
                            existing.UpdatedAt = DateTime.Now;
                            updatedCount++;
                        }
                        else
                        {
                            var spec = new ProductSpec
                            {
                                ProductId = productId,
                                SpecsJson = specsJson,
                                CreatedAt = DateTime.Now
                            };
                            db.ProductSpecs.Add(spec);
                            importedCount++;
                        }
                    }
                    catch (Exception ex)
                    {
                        errorCount++;
                        errors.Add($"{productId}: {ex.Message}");
                        // Log lỗi nhưng tiếp tục với sản phẩm khác
                        System.Diagnostics.Debug.WriteLine($"Error importing {productId}: {ex.Message}");
                    }
                }

                db.SaveChanges();

                string message = $"Import specs thành công! Mới: {importedCount}, Cập nhật: {updatedCount}";
                if (errorCount > 0)
                {
                    message += $", Lỗi: {errorCount}";
                    if (errors.Count > 0 && errors.Count <= 5)
                    {
                        message += " (" + string.Join("; ", errors) + ")";
                    }
                }

                return Json(new
                {
                    success = errorCount == 0 || importedCount + updatedCount > 0,
                    message = message
                }, JsonRequestBehavior.AllowGet);
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = $"Lỗi: {ex.Message}" }, JsonRequestBehavior.AllowGet);
            }
        }

        // POST: Admin/Import
        [HttpPost]
        public ActionResult ImportProducts()
        {
            if (!IsAdminLoggedIn())
            {
                return Json(new { success = false, message = "Vui lòng đăng nhập" }, JsonRequestBehavior.AllowGet);
            }
            try
            {
                string jsonPath = Server.MapPath("~/App_Data/products.json");
                if (!System.IO.File.Exists(jsonPath))
                {
                    return Json(new { success = false, message = "File products.json không tồn tại!" }, JsonRequestBehavior.AllowGet);
                }

                string jsonContent = System.IO.File.ReadAllText(jsonPath);
                var productsData = JsonConvert.DeserializeObject<Dictionary<string, List<dynamic>>>(jsonContent);

                if (productsData == null)
                {
                    return Json(new { success = false, message = "Không thể đọc dữ liệu từ products.json" }, JsonRequestBehavior.AllowGet);
                }

                int importedCount = 0;
                int updatedCount = 0;

                foreach (var category in productsData.Keys)
                {
                    foreach (var item in productsData[category])
                    {
                        string productId = item.id?.ToString() ?? "";
                        if (string.IsNullOrEmpty(productId)) continue;

                        var existingProduct = db.Products.FirstOrDefault(p => p.ProductId == productId);

                        string imagesJson = "";
                        string tagsJson = "";

                        if (item.images != null)
                        {
                            imagesJson = JsonConvert.SerializeObject(item.images);
                        }
                        else if (item.image != null)
                        {
                            imagesJson = JsonConvert.SerializeObject(new List<string> { item.image.ToString() });
                        }

                        if (item.tags != null)
                        {
                            tagsJson = JsonConvert.SerializeObject(item.tags);
                        }

                        if (existingProduct != null)
                        {
                            // Update
                            existingProduct.Title = item.title?.ToString() ?? "";
                            existingProduct.Link = item.link?.ToString() ?? "";
                            existingProduct.Image = item.image?.ToString() ?? "";
                            existingProduct.Images = imagesJson;
                            existingProduct.Tags = tagsJson;
                            existingProduct.Price = item.price?.ToString() ?? "";
                            existingProduct.OldPrice = item.oldPrice?.ToString() ?? "";
                            existingProduct.Discount = item.discount?.ToString() ?? "";
                            existingProduct.Score = item.score?.ToString() ?? "";
                            existingProduct.Sold = item.sold?.ToString() ?? "";
                            existingProduct.Category = category;
                            existingProduct.UpdatedAt = DateTime.Now;
                            updatedCount++;
                        }
                        else
                        {
                            // Insert
                            var product = new Product
                            {
                                ProductId = productId,
                                Title = item.title?.ToString() ?? "",
                                Link = item.link?.ToString() ?? "",
                                Image = item.image?.ToString() ?? "",
                                Images = imagesJson,
                                Tags = tagsJson,
                                Price = item.price?.ToString() ?? "",
                                OldPrice = item.oldPrice?.ToString() ?? "",
                                Discount = item.discount?.ToString() ?? "",
                                Score = item.score?.ToString() ?? "",
                                Sold = item.sold?.ToString() ?? "",
                                Category = category,
                                CreatedAt = DateTime.Now
                            };
                            db.Products.Add(product);
                            importedCount++;
                        }
                    }
                }

                db.SaveChanges();

                return Json(new
                {
                    success = true,
                    message = $"Import thành công! Sản phẩm mới: {importedCount}, Cập nhật: {updatedCount}"
                }, JsonRequestBehavior.AllowGet);
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = $"Lỗi: {ex.Message}" }, JsonRequestBehavior.AllowGet);
            }
        }

        protected override void Dispose(bool disposing)
        {
            if (disposing)
            {
                db.Dispose();
            }
            base.Dispose(disposing);
        }
    }
}

