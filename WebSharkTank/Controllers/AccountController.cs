using System;
using System.Linq;
using System.Web.Mvc;
using WebSharkTank.Models;
using WebSharkTank.Helpers;

namespace WebSharkTank.Controllers
{
    public class AccountController : Controller
    {
        private AppDbContext db;

        protected override void OnActionExecuting(ActionExecutingContext filterContext)
        {
            try
            {
                db = new AppDbContext();
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"AppDbContext Error: {ex.Message}");
                // Tạo db context rỗng để tránh crash
                db = null;
            }
            base.OnActionExecuting(filterContext);
        }

        // GET: Account/Login
        public ActionResult Login()
        {
            // Lưu ReturnUrl vào ViewBag để JavaScript có thể sử dụng
            if (TempData["ReturnUrl"] != null)
            {
                ViewBag.ReturnUrl = TempData["ReturnUrl"];
            }
            return View();
        }

        // GET: Account/Register
        public ActionResult Register()
        {
            return View();
        }

        // GET: Account/ForgotPassword
        public ActionResult ForgotPassword()
        {
            return View();
        }

        // POST: Account/ForgotPassword
        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult ForgotPassword(string email)
        {
            // TODO: Implement forgot password logic
            // For now, just return success message
            return Json(new { success = true, message = "Chúng tôi đã gửi link reset mật khẩu đến email của bạn!" });
        }

        // POST: Account/Login
        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult Login(string email, string password, bool rememberMe = false)
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

                // Set session
                Session["UserId"] = user.Id;
                Session["UserName"] = user.Name;
                Session["UserEmail"] = user.Email;
                Session["UserRole"] = user.Role; // Lưu Role vào session (0 = User, 99 = Admin)

                // Kiểm tra ReturnUrl từ TempData hoặc Request
                string returnUrl = TempData["ReturnUrl"] as string;
                if (string.IsNullOrEmpty(returnUrl))
                {
                    returnUrl = Request.QueryString["ReturnUrl"];
                }
                if (string.IsNullOrEmpty(returnUrl))
                {
                    returnUrl = Url.Action("Index", "Home");
                }

                return Json(new { 
                    success = true, 
                    message = "Đăng nhập thành công!", 
                    redirectUrl = returnUrl
                });
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Login Error: {ex.Message}");
                return Json(new { success = false, message = "Có lỗi xảy ra khi đăng nhập" });
            }
        }

        // POST: Account/Register
        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult Register(string name, string email, string password, string confirmPassword)
        {
            try
            {
                if (string.IsNullOrEmpty(name) || string.IsNullOrEmpty(email) || string.IsNullOrEmpty(password))
                {
                    return Json(new { success = false, message = "Vui lòng nhập đầy đủ thông tin" });
                }

                if (password != confirmPassword)
                {
                    return Json(new { success = false, message = "Mật khẩu nhập lại không khớp" });
                }

                if (password.Length < 6)
                {
                    return Json(new { success = false, message = "Mật khẩu phải có ít nhất 6 ký tự" });
                }

                if (db == null)
                {
                    return Json(new { success = false, message = "Lỗi kết nối database" });
                }

                email = email.ToLower().Trim();
                if (db.Users.Any(u => u.Email == email))
                {
                    return Json(new { success = false, message = "Email đã được sử dụng" });
                }

                // Hash password
                string passwordHash = PasswordHelper.HashPassword(password);

                // Create user
                var user = new User
                {
                    Name = name.Trim(),
                    Email = email,
                    PasswordHash = passwordHash,
                    CreatedAt = DateTime.Now,
                    Role = 0 // Mặc định là 0 (User)
                };

                db.Users.Add(user);
                db.SaveChanges();

                // Set session
                Session["UserId"] = user.Id;
                Session["UserName"] = user.Name;
                Session["UserEmail"] = user.Email;
                Session["UserRole"] = user.Role; // Lưu Role vào session (0 = User, 99 = Admin)

                return Json(new { 
                    success = true, 
                    message = "Đăng ký thành công!", 
                    redirectUrl = Url.Action("Index", "Home") 
                });
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Register Error: {ex.Message}");
                return Json(new { success = false, message = "Có lỗi xảy ra khi đăng ký" });
            }
        }

        // GET: Account/Logout
        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult Logout()
        {
            Session.Clear();
            Session.Abandon();
            return Json(new { success = true, message = "Đã đăng xuất" });
        }

        // GET: Account/GetCurrentUser
        [HttpGet]
        public ActionResult GetCurrentUser()
        {
            try
            {
                var userIdObj = Session["UserId"];
                if (userIdObj == null)
                {
                    return Json(new { success = true, authenticated = false }, JsonRequestBehavior.AllowGet);
                }

                int userId = Convert.ToInt32(userIdObj);
                if (db == null)
                {
                    return Json(new { success = true, authenticated = false }, JsonRequestBehavior.AllowGet);
                }

                var user = db.Users.Find(userId);
                if (user == null)
                {
                    Session.Clear();
                    return Json(new { success = true, authenticated = false }, JsonRequestBehavior.AllowGet);
                }

                return Json(new
                {
                    success = true,
                    authenticated = true,
                    user = new
                    {
                        id = user.Id,
                        name = user.Name,
                        email = user.Email,
                        role = user.Role
                    }
                }, JsonRequestBehavior.AllowGet);
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"GetCurrentUser Error: {ex.Message}");
                return Json(new { success = true, authenticated = false }, JsonRequestBehavior.AllowGet);
            }
        }

        // POST: Account/StartGuestSession
        [HttpPost]
        public ActionResult StartGuestSession(string email, string name = "Khách hàng")
        {
            try
            {
                if (string.IsNullOrEmpty(email))
                {
                    return Json(new { success = false, message = "Vui lòng cung cấp Email hợp lệ" });
                }

                email = email.ToLower().Trim();
                
                if (db == null)
                {
                    return Json(new { success = false, message = "Lỗi kết nối database" });
                }

                // Check if user already exists
                var user = db.Users.FirstOrDefault(u => u.Email == email);
                if (user == null)
                {
                    // Create a new guest user
                    user = new User
                    {
                        Email = email,
                        Name = string.IsNullOrEmpty(name) ? "Khách hàng" : name.Trim(),
                        PasswordHash = "GUEST_ACCOUNT_" + Guid.NewGuid().ToString("N"),
                        CreatedAt = DateTime.Now,
                        Role = 0
                    };
                    db.Users.Add(user);
                    db.SaveChanges();
                }

                // Set session
                Session["UserId"] = user.Id;
                Session["UserName"] = user.Name;
                Session["UserEmail"] = user.Email;
                Session["UserRole"] = user.Role;
                Session["IsGuest"] = true;
                Session["GuestAddressIds"] = new System.Collections.Generic.List<int>();

                return Json(new { success = true, message = "Thiết lập phiên khách thành công!", redirectUrl = "/Shipping" });
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"StartGuestSession Error: {ex.Message}");
                return Json(new { success = false, message = "Có lỗi xảy ra: " + ex.Message });
            }
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

