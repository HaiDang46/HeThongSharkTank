using System.Web.Mvc;
using System.Collections.Generic;
using System.Linq;
using WebSharkTank.Models;
using System;

namespace WebSharkTank.Controllers
{
    public class ShippingController : Controller
    {
        private AppDbContext db = new AppDbContext();

        // Helper method để kiểm tra đăng nhập
        private bool IsUserLoggedIn()
        {
            var userId = Session["UserId"];
            var userEmail = Session["UserEmail"];
            return userId != null && !string.IsNullOrEmpty(userEmail?.ToString());
        }

        // GET: Shipping
        public ActionResult Index()
        {
            // Kiểm tra đăng nhập
            if (!IsUserLoggedIn())
            {
                // Chưa đăng nhập - trả về view với flag để hiển thị SweetAlert
                System.Diagnostics.Debug.WriteLine("[Shipping] User not logged in, showing alert");
                ViewBag.RequireLogin = true;
                ViewBag.Addresses = new List<Address>(); // Trả về list rỗng
                return View();
            }

            var userId = Session["UserId"];
            var userEmail = Session["UserEmail"];
            
            // Debug log
            System.Diagnostics.Debug.WriteLine($"[Shipping] Index - UserId: {userId}, UserEmail: {userEmail}");

            try
            {
                int userIdInt = Convert.ToInt32(userId);
                var addresses = db.Addresses.Where(a => a.UserId == userIdInt).OrderByDescending(a => a.IsDefault).ThenByDescending(a => a.CreatedAt).ToList();
                ViewBag.Addresses = addresses;
                ViewBag.RequireLogin = false;
                System.Diagnostics.Debug.WriteLine($"[Shipping] User logged in, found {addresses.Count} addresses");
                return View();
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"[Shipping] Error: {ex.Message}");
                // Nếu có lỗi, vẫn hiển thị view với flag yêu cầu đăng nhập
                ViewBag.RequireLogin = true;
                ViewBag.Addresses = new List<Address>();
                return View();
            }
        }

        // GET: Shipping/GetProvinces
        [HttpGet]
        public ActionResult GetProvinces()
        {
            try
            {
                using (var client = new System.Net.WebClient())
                {
                    client.Encoding = System.Text.Encoding.UTF8;
                    var json = client.DownloadString("https://provinces.open-api.vn/api/v1/p/");
                    var provinces = Newtonsoft.Json.JsonConvert.DeserializeObject<List<dynamic>>(json);
                    
                    var provinceNames = provinces.Select(p => p.name.ToString()).OrderBy(n => n).ToList();
                    return Json(provinceNames, JsonRequestBehavior.AllowGet);
                }
            }
            catch (Exception ex)
            {
                // Fallback về danh sách hardcode nếu API lỗi
                System.Diagnostics.Debug.WriteLine($"Error loading provinces from API: {ex.Message}");
                var provinces = new List<string>
                {
                    "An Giang", "Bà Rịa - Vũng Tàu", "Bắc Giang", "Bắc Kạn", "Bạc Liêu",
                    "Bắc Ninh", "Bến Tre", "Bình Dương", "Bình Định", "Bình Phước",
                    "Bình Thuận", "Cà Mau", "Cần Thơ", "Cao Bằng", "Đà Nẵng",
                    "Đắk Lắk", "Đắk Nông", "Điện Biên", "Đồng Nai", "Đồng Tháp",
                    "Gia Lai", "Hà Giang", "Hà Nam", "Hà Nội", "Hà Tĩnh",
                    "Hải Dương", "Hải Phòng", "Hậu Giang", "Hòa Bình", "Hưng Yên",
                    "Khánh Hòa", "Kiên Giang", "Kon Tum", "Lai Châu", "Lâm Đồng",
                    "Lạng Sơn", "Lào Cai", "Long An", "Nam Định", "Nghệ An",
                    "Ninh Bình", "Ninh Thuận", "Phú Thọ", "Phú Yên", "Quảng Bình",
                    "Quảng Nam", "Quảng Ngãi", "Quảng Ninh", "Quảng Trị", "Sóc Trăng",
                    "Sơn La", "Tây Ninh", "Thái Bình", "Thái Nguyên", "Thanh Hóa",
                    "Thừa Thiên Huế", "Tiền Giang", "TP Hồ Chí Minh", "Trà Vinh",
                    "Tuyên Quang", "Vĩnh Long", "Vĩnh Phúc", "Yên Bái"
                };
                return Json(provinces, JsonRequestBehavior.AllowGet);
            }
        }

        // GET: Shipping/GetAddresses
        [HttpGet]
        public ActionResult GetAddresses()
        {
            var userId = Session["UserId"];
            if (userId == null)
            {
                return Json(new { success = false, message = "Vui lòng đăng nhập" }, JsonRequestBehavior.AllowGet);
            }

            try
            {
                int userIdInt = Convert.ToInt32(userId);
                var addresses = db.Addresses
                    .Where(a => a.UserId == userIdInt)
                    .OrderByDescending(a => a.IsDefault)
                    .ThenByDescending(a => a.CreatedAt)
                    .Select(a => new
                    {
                        id = a.Id,
                        name = a.Name,
                        phone = a.Phone,
                        streetAddress = a.StreetAddress,
                        province = a.Province,
                        district = a.District,
                        ward = a.Ward,
                        isDefault = a.IsDefault
                    })
                    .ToList();

                return Json(new { success = true, addresses = addresses }, JsonRequestBehavior.AllowGet);
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Lỗi: " + ex.Message }, JsonRequestBehavior.AllowGet);
            }
        }

        // POST: Shipping/SaveAddress
        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult SaveAddress(string name, string phone, string address, string province, string district = null, string ward = null, bool isDefault = false, int? id = null)
        {
            var userId = Session["UserId"];
            if (userId == null)
            {
                return Json(new { success = false, message = "Vui lòng đăng nhập để lưu địa chỉ" });
            }

            try
            {
                if (string.IsNullOrEmpty(name) || string.IsNullOrEmpty(phone) || string.IsNullOrEmpty(address) || string.IsNullOrEmpty(province))
                {
                    return Json(new { success = false, message = "Vui lòng nhập đầy đủ thông tin" });
                }

                int userIdInt = Convert.ToInt32(userId);

                // Nếu có id thì là sửa, không có thì là thêm mới
                if (id.HasValue && id.Value > 0)
                {
                    var existingAddress = db.Addresses.FirstOrDefault(a => a.Id == id.Value && a.UserId == userIdInt);
                    if (existingAddress == null)
                    {
                        return Json(new { success = false, message = "Không tìm thấy địa chỉ" });
                    }

                    // Nếu đặt làm mặc định, bỏ mặc định của các địa chỉ khác
                    if (isDefault && !existingAddress.IsDefault)
                    {
                        var otherAddresses = db.Addresses.Where(a => a.UserId == userIdInt && a.Id != id.Value && a.IsDefault);
                        foreach (var addr in otherAddresses)
                        {
                            addr.IsDefault = false;
                        }
                    }

                    existingAddress.Name = name.Trim();
                    existingAddress.Phone = phone.Trim();
                    existingAddress.StreetAddress = address.Trim();
                    existingAddress.Province = province.Trim();
                    existingAddress.District = district != null ? district.Trim() : null;
                    existingAddress.Ward = ward != null ? ward.Trim() : null;
                    existingAddress.IsDefault = isDefault;
                    existingAddress.UpdatedAt = DateTime.Now;

                    db.SaveChanges();
                    return Json(new { success = true, message = "Đã cập nhật địa chỉ thành công!", addressId = existingAddress.Id });
                }
                else
                {
                    // Nếu đặt làm mặc định, bỏ mặc định của các địa chỉ khác
                    if (isDefault)
                    {
                        var otherAddresses = db.Addresses.Where(a => a.UserId == userIdInt && a.IsDefault);
                        foreach (var addr in otherAddresses)
                        {
                            addr.IsDefault = false;
                        }
                    }

                    var newAddress = new Address
                    {
                        UserId = userIdInt,
                        Name = name.Trim(),
                        Phone = phone.Trim(),
                        StreetAddress = address.Trim(),
                        Province = province.Trim(),
                        District = district != null ? district.Trim() : null,
                        Ward = ward != null ? ward.Trim() : null,
                        IsDefault = isDefault,
                        CreatedAt = DateTime.Now
                    };

                    db.Addresses.Add(newAddress);
                    db.SaveChanges();

                    return Json(new { success = true, message = "Đã lưu địa chỉ thành công!", addressId = newAddress.Id });
                }
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Có lỗi xảy ra: " + ex.Message });
            }
        }

        // POST: Shipping/DeleteAddress
        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult DeleteAddress(int id)
        {
            var userId = Session["UserId"];
            if (userId == null)
            {
                return Json(new { success = false, message = "Vui lòng đăng nhập" });
            }

            try
            {
                int userIdInt = Convert.ToInt32(userId);
                var address = db.Addresses.FirstOrDefault(a => a.Id == id && a.UserId == userIdInt);
                if (address == null)
                {
                    return Json(new { success = false, message = "Không tìm thấy địa chỉ" });
                }

                db.Addresses.Remove(address);
                db.SaveChanges();

                return Json(new { success = true, message = "Đã xóa địa chỉ thành công" });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Có lỗi xảy ra: " + ex.Message });
            }
        }

        // POST: Shipping/SetDefaultAddress
        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult SetDefaultAddress(int id)
        {
            var userId = Session["UserId"];
            if (userId == null)
            {
                return Json(new { success = false, message = "Vui lòng đăng nhập" });
            }

            try
            {
                int userIdInt = Convert.ToInt32(userId);
                var address = db.Addresses.FirstOrDefault(a => a.Id == id && a.UserId == userIdInt);
                if (address == null)
                {
                    return Json(new { success = false, message = "Không tìm thấy địa chỉ" });
                }

                // Bỏ mặc định của tất cả địa chỉ khác
                var otherAddresses = db.Addresses.Where(a => a.UserId == userIdInt && a.Id != id);
                foreach (var addr in otherAddresses)
                {
                    addr.IsDefault = false;
                }

                address.IsDefault = true;
                address.UpdatedAt = DateTime.Now;
                db.SaveChanges();

                return Json(new { success = true, message = "Đã đặt làm địa chỉ mặc định" });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Có lỗi xảy ra: " + ex.Message });
            }
        }

        // POST: Shipping/SetSelectedAddress
        [HttpPost]
        public ActionResult SetSelectedAddress(int addressId)
        {
            var userId = Session["UserId"];
            if (userId == null)
            {
                return Json(new { success = false, message = "Vui lòng đăng nhập" });
            }

            try
            {
                int userIdInt = Convert.ToInt32(userId);
                var address = db.Addresses.FirstOrDefault(a => a.Id == addressId && a.UserId == userIdInt);
                if (address == null)
                {
                    return Json(new { success = false, message = "Không tìm thấy địa chỉ" });
                }

                // Lưu địa chỉ được chọn vào Session
                Session["SelectedAddressId"] = addressId;
                System.Diagnostics.Debug.WriteLine($"[Shipping] Selected address ID {addressId} saved to session");

                return Json(new { success = true, message = "Đã chọn địa chỉ" });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Có lỗi xảy ra: " + ex.Message });
            }
        }

        // POST: Shipping/SetSelectedItems
        [HttpPost]
        public ActionResult SetSelectedItems(string selectedItems)
        {
            var userId = Session["UserId"];
            if (userId == null)
            {
                return Json(new { success = false, message = "Vui lòng đăng nhập" });
            }

            try
            {
                if (string.IsNullOrEmpty(selectedItems))
                {
                    return Json(new { success = false, message = "Không có mặt hàng nào được chọn" });
                }

                // Lưu danh sách mặt hàng đã chọn vào Session
                Session["SelectedItems"] = selectedItems;
                System.Diagnostics.Debug.WriteLine($"[Shipping] Selected items saved to session: {selectedItems}");

                return Json(new { success = true, message = "Đã lưu danh sách mặt hàng" });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Có lỗi xảy ra: " + ex.Message });
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

