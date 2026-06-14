using System.Web.Mvc;

namespace WebSharkTank.Controllers
{
    public class CheckoutController : Controller
    {
        // Helper method để kiểm tra đăng nhập
        private bool IsUserLoggedIn()
        {
            var userId = Session["UserId"];
            var userEmail = Session["UserEmail"];
            return userId != null && !string.IsNullOrEmpty(userEmail?.ToString());
        }

        // GET: Checkout
        public ActionResult Index()
        {
            // Kiểm tra đăng nhập - bắt buộc phải đăng nhập
            if (!IsUserLoggedIn())
            {
                // Chưa đăng nhập - redirect đến trang đăng nhập
                System.Diagnostics.Debug.WriteLine("[Checkout] User not logged in, redirecting to Login");
                TempData["ReturnUrl"] = "/Checkout";
                return RedirectToAction("Login", "Account");
            }

            var userId = Session["UserId"];
            var userEmail = Session["UserEmail"];
            
            // Debug log
            System.Diagnostics.Debug.WriteLine($"[Checkout] Index - UserId: {userId}, UserEmail: {userEmail}");

            return View();
        }
    }
}

