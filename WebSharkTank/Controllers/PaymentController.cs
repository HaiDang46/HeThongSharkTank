using System.Web.Mvc;
using System.Linq;
using WebSharkTank.Models;
using System;
using System.Collections.Generic;
using Newtonsoft.Json;

namespace WebSharkTank.Controllers
{
    public class PaymentController : Controller
    {
        private AppDbContext db = new AppDbContext();

        // Helper method để kiểm tra đăng nhập
        private bool IsUserLoggedIn()
        {
            var userId = Session["UserId"];
            var userEmail = Session["UserEmail"];
            return userId != null && !string.IsNullOrEmpty(userEmail?.ToString());
        }

        // GET: Payment
        public ActionResult Index()
        {
            // Kiểm tra đăng nhập
            if (!IsUserLoggedIn())
            {
                System.Diagnostics.Debug.WriteLine("[Payment] User not logged in, redirecting to Login");
                TempData["ReturnUrl"] = "/Payment";
                return RedirectToAction("Login", "Account");
            }

            var userId = Session["UserId"];
            
            try
            {
                int userIdInt = Convert.ToInt32(userId);
                
                // Lấy địa chỉ đã chọn từ Session, nếu không có thì lấy mặc định
                // (addressId sẽ được lấy từ localStorage ở client-side và gửi lên server)
                Address selectedAddress = null;
                var selectedAddressId = Session["SelectedAddressId"];
                
                System.Diagnostics.Debug.WriteLine($"[Payment] SelectedAddressId from session: {selectedAddressId}");
                
                if (selectedAddressId != null)
                {
                    int addressId = Convert.ToInt32(selectedAddressId);
                    selectedAddress = db.Addresses.FirstOrDefault(a => a.Id == addressId && a.UserId == userIdInt);
                    System.Diagnostics.Debug.WriteLine($"[Payment] Found address from session: {selectedAddress != null}, AddressId: {addressId}");
                }
                
                // Nếu không có địa chỉ đã chọn, lấy địa chỉ mặc định hoặc địa chỉ đầu tiên
                if (selectedAddress == null)
                {
                    System.Diagnostics.Debug.WriteLine("[Payment] No address from session, getting default or first address");
                    selectedAddress = db.Addresses
                        .Where(a => a.UserId == userIdInt)
                        .OrderByDescending(a => a.IsDefault)
                        .ThenByDescending(a => a.CreatedAt)
                        .FirstOrDefault();
                    System.Diagnostics.Debug.WriteLine($"[Payment] Found default/first address: {selectedAddress != null}");
                }

                if (selectedAddress != null)
                {
                    var fullAddr = GetFullAddress(selectedAddress);
                    System.Diagnostics.Debug.WriteLine($"[Payment] Address details - Name: {selectedAddress.Name}, Street: {selectedAddress.StreetAddress}, Ward: {selectedAddress.Ward}, District: {selectedAddress.District}, Province: {selectedAddress.Province}");
                    System.Diagnostics.Debug.WriteLine($"[Payment] Full address: {fullAddr}");
                    
                    ViewBag.Address = new
                    {
                        name = selectedAddress.Name,
                        phone = selectedAddress.Phone,
                        streetAddress = selectedAddress.StreetAddress,
                        province = selectedAddress.Province,
                        district = selectedAddress.District,
                        ward = selectedAddress.Ward,
                        fullAddress = fullAddr
                    };
                }
                else
                {
                    System.Diagnostics.Debug.WriteLine("[Payment] No address found for user");
                    ViewBag.Address = null;
                }

                // Lấy danh sách mặt hàng đã chọn từ Session
                var selectedItemsJson = Session["SelectedItems"] as string;
                System.Diagnostics.Debug.WriteLine($"[Payment] SelectedItems JSON from session: {selectedItemsJson}");
                
                if (!string.IsNullOrEmpty(selectedItemsJson))
                {
                    try
                    {
                        // Deserialize thành List<object> để dễ xử lý
                        var selectedItems = JsonConvert.DeserializeObject<List<Dictionary<string, object>>>(selectedItemsJson);
                        ViewBag.SelectedItems = selectedItems;
                        System.Diagnostics.Debug.WriteLine($"[Payment] Loaded {selectedItems?.Count ?? 0} selected items from session");
                        
                        // Debug: in ra từng item
                        if (selectedItems != null)
                        {
                            foreach (var item in selectedItems)
                            {
                                var itemId = item.ContainsKey("id") ? item["id"]?.ToString() : "N/A";
                                var itemName = item.ContainsKey("name") ? item["name"]?.ToString() : "N/A";
                                var itemQty = item.ContainsKey("qty") ? item["qty"]?.ToString() : "N/A";
                                var itemPrice = item.ContainsKey("price") ? item["price"]?.ToString() : "N/A";
                                System.Diagnostics.Debug.WriteLine($"[Payment] Item: id={itemId}, name={itemName}, qty={itemQty}, price={itemPrice}");
                            }
                        }
                    }
                    catch (Exception ex)
                    {
                        System.Diagnostics.Debug.WriteLine($"[Payment] Error parsing selected items: {ex.Message}\n{ex.StackTrace}");
                        ViewBag.SelectedItems = null;
                    }
                }
                else
                {
                    System.Diagnostics.Debug.WriteLine("[Payment] No SelectedItems in session");
                    ViewBag.SelectedItems = null;
                }

                return View();
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"[Payment] Error: {ex.Message}");
                ViewBag.Address = null;
                ViewBag.SelectedItems = null;
                return View();
            }
        }

        // POST: Payment/CreateOrder
        [HttpPost]
        public ActionResult CreateOrder(string paymentMethod, int? addressId, string items, string addressName = null, string addressPhone = null, string addressStreet = null, string addressProvince = null, string addressDistrict = null, string addressWard = null)
        {
            try
            {
                // Kiểm tra đăng nhập
                if (!IsUserLoggedIn())
                {
                    return Json(new { success = false, message = "Vui lòng đăng nhập" });
                }

                var userIdObj = Session["UserId"];
                int userId = Convert.ToInt32(userIdObj);

                System.Diagnostics.Debug.WriteLine($"[Payment] CreateOrder - UserId: {userId}, AddressId: {addressId}, PaymentMethod: {paymentMethod}");

                Address address = null;
                
                // Nếu có addressId, kiểm tra địa chỉ đã tồn tại
                if (addressId.HasValue && addressId.Value > 0)
                {
                    address = db.Addresses.FirstOrDefault(a => a.Id == addressId.Value && a.UserId == userId);
                    System.Diagnostics.Debug.WriteLine($"[Payment] Address from ID: {address != null}");
                }
                
                // Nếu không có địa chỉ từ ID, và có thông tin địa chỉ mới, tạo địa chỉ mới
                if (address == null && !string.IsNullOrEmpty(addressName) && !string.IsNullOrEmpty(addressPhone) && !string.IsNullOrEmpty(addressStreet) && !string.IsNullOrEmpty(addressProvince))
                {
                    System.Diagnostics.Debug.WriteLine("[Payment] Creating new address from order data");
                    
                    // Kiểm tra xem địa chỉ này đã tồn tại chưa (tránh trùng lặp)
                    var existingAddress = db.Addresses.FirstOrDefault(a => 
                        a.UserId == userId && 
                        a.Name == addressName.Trim() && 
                        a.Phone == addressPhone.Trim() && 
                        a.StreetAddress == addressStreet.Trim() && 
                        a.Province == addressProvince.Trim() &&
                        (string.IsNullOrEmpty(addressDistrict) || a.District == addressDistrict.Trim()) &&
                        (string.IsNullOrEmpty(addressWard) || a.Ward == addressWard.Trim()));
                    
                    if (existingAddress != null)
                    {
                        address = existingAddress;
                        System.Diagnostics.Debug.WriteLine($"[Payment] Found existing address with same data, using ID: {address.Id}");
                    }
                    else
                    {
                        // Tạo địa chỉ mới
                        address = new Address
                        {
                            UserId = userId,
                            Name = addressName.Trim(),
                            Phone = addressPhone.Trim(),
                            StreetAddress = addressStreet.Trim(),
                            Province = addressProvince.Trim(),
                            District = !string.IsNullOrEmpty(addressDistrict) ? addressDistrict.Trim() : null,
                            Ward = !string.IsNullOrEmpty(addressWard) ? addressWard.Trim() : null,
                            IsDefault = false, // Không tự động đặt làm mặc định
                            CreatedAt = DateTime.Now
                        };
                        
                        db.Addresses.Add(address);
                        db.SaveChanges(); // Lưu để có AddressId
                        System.Diagnostics.Debug.WriteLine($"[Payment] Created new address with ID: {address.Id}");
                    }
                }
                
                // Nếu vẫn không có địa chỉ, lấy địa chỉ mặc định hoặc đầu tiên
                if (address == null)
                {
                    System.Diagnostics.Debug.WriteLine("[Payment] No address provided, getting default or first address");
                    address = db.Addresses
                        .Where(a => a.UserId == userId)
                        .OrderByDescending(a => a.IsDefault)
                        .ThenByDescending(a => a.CreatedAt)
                        .FirstOrDefault();
                }
                
                if (address == null)
                {
                    return Json(new { success = false, message = "Vui lòng thêm địa chỉ giao hàng trước khi đặt đơn hàng" });
                }
                
                System.Diagnostics.Debug.WriteLine($"[Payment] Using address ID: {address.Id}, Name: {address.Name}");

                // Parse items từ JSON
                List<Dictionary<string, object>> orderItems = null;
                try
                {
                    orderItems = JsonConvert.DeserializeObject<List<Dictionary<string, object>>>(items);
                }
                catch (Exception ex)
                {
                    System.Diagnostics.Debug.WriteLine($"[Payment] Error parsing items: {ex.Message}");
                    return Json(new { success = false, message = "Dữ liệu sản phẩm không hợp lệ" });
                }

                if (orderItems == null || orderItems.Count == 0)
                {
                    return Json(new { success = false, message = "Không có sản phẩm nào trong đơn hàng" });
                }

                // Tính tổng tiền
                decimal totalAmount = 0;
                decimal shippingFee = 0; // Free shipping

                foreach (var item in orderItems)
                {
                    var price = item.ContainsKey("price") ? Convert.ToDecimal(item["price"] ?? 0) : 0;
                    var qty = item.ContainsKey("qty") ? Convert.ToInt32(item["qty"] ?? 1) : 1;
                    totalAmount += price * qty;
                }

                System.Diagnostics.Debug.WriteLine($"[Payment] Total amount: {totalAmount}, Items count: {orderItems.Count}");

                // Tạo đơn hàng
                var order = new Order
                {
                    UserId = userId,
                    AddressId = address.Id, // Sử dụng address.Id (có thể là địa chỉ mới được tạo)
                    PaymentMethod = paymentMethod ?? "COD",
                    TotalAmount = totalAmount,
                    ShippingFee = shippingFee,
                    Status = "Pending",
                    CreatedAt = DateTime.Now
                };

                db.Orders.Add(order);
                db.SaveChanges(); // Lưu để có OrderId

                System.Diagnostics.Debug.WriteLine($"[Payment] Order created with ID: {order.Id}");

                // Tạo order items
                foreach (var item in orderItems)
                {
                    var orderItem = new OrderItem
                    {
                        OrderId = order.Id,
                        ProductId = item.ContainsKey("id") ? (item["id"]?.ToString() ?? "") : "",
                        ProductName = item.ContainsKey("name") ? (item["name"]?.ToString() ?? "Sản phẩm") : "Sản phẩm",
                        Price = item.ContainsKey("price") ? Convert.ToDecimal(item["price"] ?? 0) : 0,
                        Quantity = item.ContainsKey("qty") ? Convert.ToInt32(item["qty"] ?? 1) : 1,
                        ProductImage = item.ContainsKey("img") ? (item["img"]?.ToString() ?? "") : "",
                        CreatedAt = DateTime.Now
                    };

                    db.OrderItems.Add(orderItem);
                }

                db.SaveChanges();

                System.Diagnostics.Debug.WriteLine($"[Payment] Order items created: {orderItems.Count} items");

                // Xóa cart items sau khi tạo đơn hàng thành công
                // Lấy danh sách ProductId và Quantity từ order items
                var orderItemDict = new Dictionary<string, int>();
                foreach (var item in orderItems)
                {
                    if (item.ContainsKey("id") && item["id"] != null)
                    {
                        var productId = item["id"]?.ToString();
                        var qty = item.ContainsKey("qty") ? Convert.ToInt32(item["qty"] ?? 1) : 1;
                        if (!string.IsNullOrEmpty(productId))
                        {
                            if (orderItemDict.ContainsKey(productId))
                            {
                                orderItemDict[productId] += qty;
                            }
                            else
                            {
                                orderItemDict[productId] = qty;
                            }
                        }
                    }
                }

                // Xóa hoặc giảm số lượng trong cart
                foreach (var kvp in orderItemDict)
                {
                    var productId = kvp.Key;
                    var orderQty = kvp.Value;
                    
                    var cartItem = db.CartItems
                        .FirstOrDefault(c => c.UserId == userId && c.ProductId == productId);
                    
                    if (cartItem != null)
                    {
                        if (cartItem.Quantity <= orderQty)
                        {
                            // Xóa toàn bộ cart item nếu số lượng trong cart <= số lượng đã đặt
                            db.CartItems.Remove(cartItem);
                            System.Diagnostics.Debug.WriteLine($"[Payment] Removed cart item: {productId} (qty: {cartItem.Quantity})");
                        }
                        else
                        {
                            // Giảm số lượng trong cart
                            cartItem.Quantity -= orderQty;
                            cartItem.UpdatedAt = DateTime.Now;
                            System.Diagnostics.Debug.WriteLine($"[Payment] Reduced cart item: {productId} from {cartItem.Quantity + orderQty} to {cartItem.Quantity}");
                        }
                    }
                }
                
                db.SaveChanges();
                System.Diagnostics.Debug.WriteLine($"[Payment] Cart updated after order creation");

                return Json(new { success = true, message = "Đơn hàng đã được tạo thành công", orderId = order.Id });
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"[Payment] Error creating order: {ex.Message}\n{ex.StackTrace}");
                return Json(new { success = false, message = $"Có lỗi xảy ra: {ex.Message}" });
            }
        }

        private string GetFullAddress(Address addr)
        {
            var parts = new System.Collections.Generic.List<string>();
            // Thứ tự: StreetAddress, Ward, District, Province
            if (!string.IsNullOrEmpty(addr.StreetAddress)) parts.Add(addr.StreetAddress);
            if (!string.IsNullOrEmpty(addr.Ward)) parts.Add(addr.Ward);
            if (!string.IsNullOrEmpty(addr.District)) parts.Add(addr.District);
            if (!string.IsNullOrEmpty(addr.Province)) parts.Add(addr.Province);
            return string.Join(", ", parts);
        }
    }
}

