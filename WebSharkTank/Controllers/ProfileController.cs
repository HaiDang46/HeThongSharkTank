using System;
using System.Collections.Generic;
using System.Web.Mvc;
using System.Linq;
using WebSharkTank.Models;

namespace WebSharkTank.Controllers
{
    public class ProfileController : Controller
    {
        private AppDbContext db = new AppDbContext();

        // Helper method để kiểm tra đăng nhập
        private bool IsUserLoggedIn()
        {
            var userId = Session["UserId"];
            var userEmail = Session["UserEmail"];
            return userId != null && !string.IsNullOrEmpty(userEmail?.ToString());
        }

        // GET: Profile
        public ActionResult Index()
        {
            try
            {
                // Kiểm tra đăng nhập
                if (!IsUserLoggedIn())
                {
                    return RedirectToAction("Login", "Account", new { ReturnUrl = "/Profile" });
                }

                var userIdObj = Session["UserId"];
                int userId = Convert.ToInt32(userIdObj);

                // Đếm số địa chỉ của user
                int addressCount = 0;
                try
                {
                    addressCount = db.Addresses.Count(a => a.UserId == userId);
                }
                catch
                {
                    addressCount = 0;
                }

                ViewBag.AddressCount = addressCount;
                System.Diagnostics.Debug.WriteLine($"[Profile] User {userId} has {addressCount} addresses");

                return View();
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"[Profile] Error: {ex.Message}");
                ViewBag.AddressCount = 0;
                return View();
            }
        }

        // GET: Profile/EditPersonalInfo
        public ActionResult EditPersonalInfo()
        {
            // TODO: Implement edit personal info page
            return View();
        }

        // GET: Profile/ChangePassword
        public ActionResult ChangePassword()
        {
            // TODO: Implement change password page
            return View();
        }

        // GET: Profile/AddCard
        public ActionResult AddCard()
        {
            // TODO: Implement add card page
            return View();
        }

        // GET: Profile/Addresses
        public ActionResult Addresses()
        {
            try
            {
                // Kiểm tra đăng nhập
                if (!IsUserLoggedIn())
                {
                    return RedirectToAction("Login", "Account", new { ReturnUrl = "/Profile/Addresses" });
                }

                var userIdObj = Session["UserId"];
                int userId = Convert.ToInt32(userIdObj);

                // Lấy danh sách địa chỉ của user
                var addresses = db.Addresses
                    .Where(a => a.UserId == userId)
                    .OrderByDescending(a => a.IsDefault)
                    .ThenByDescending(a => a.CreatedAt)
                    .ToList();

                ViewBag.Addresses = addresses;
                System.Diagnostics.Debug.WriteLine($"[Profile] Loaded {addresses.Count} addresses for user {userId}");

                return View();
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"[Profile] Error loading addresses: {ex.Message}");
                System.Diagnostics.Debug.WriteLine($"[Profile] Stack trace: {ex.StackTrace}");
                ViewBag.Addresses = new List<Address>();
                return View("Addresses");
            }
        }

        // GET: Profile/Orders
        public ActionResult Orders()
        {
            try
            {
                // Kiểm tra đăng nhập
                if (!IsUserLoggedIn())
                {
                    return RedirectToAction("Login", "Account", new { ReturnUrl = "/Profile/Orders" });
                }

                var userIdObj = Session["UserId"];
                int userId = Convert.ToInt32(userIdObj);

                // Lấy danh sách đơn hàng của user kèm order items
                var orders = db.Orders
                    .Where(o => o.UserId == userId)
                    .OrderByDescending(o => o.CreatedAt)
                    .ToList();

                // Lấy order items cho mỗi đơn hàng
                var ordersWithItems = new List<OrderWithItemsViewModel>();
                foreach (var order in orders)
                {
                    var orderItems = db.OrderItems
                        .Where(oi => oi.OrderId == order.Id)
                        .ToList();

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
                        FullAddress = fullAddress
                    });
                }

                ViewBag.Orders = ordersWithItems;
                System.Diagnostics.Debug.WriteLine($"[Profile] Loaded {orders.Count} orders for user {userId}");

                return View();
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"[Profile] Error loading orders: {ex.Message}");
                System.Diagnostics.Debug.WriteLine($"[Profile] Stack trace: {ex.StackTrace}");
                ViewBag.Orders = new List<OrderWithItemsViewModel>();
                return View();
            }
        }
    }
}

