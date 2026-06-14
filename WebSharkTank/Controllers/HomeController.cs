using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using WebSharkTank.Models;
using Newtonsoft.Json;

namespace WebSharkTank.Controllers
{
    public class HomeController : Controller
    {
        private AppDbContext db = new AppDbContext();

        public ActionResult Index()
        {
            return View();
        }

        // Redirect từ các link cũ sang route mới
        public ActionResult SignIn()
        {
            return RedirectToAction("Login", "Account");
        }

        public ActionResult SignUp()
        {
            return RedirectToAction("Register", "Account");
        }
        public ActionResult Installment()
        {
            return View();
        }
        public ActionResult PriceList()
        {
            return View();
        }
        public ActionResult Policy()
        {
            return View();
        }

        public ActionResult TestProvince()
        {
            // Đảm bảo response encoding là UTF-8
            Response.ContentType = "text/html; charset=utf-8";
            Response.Charset = "utf-8";
            return View();
        }

        // Serve webmanifest file
        public ActionResult WebManifest()
        {
            string manifestPath = Server.MapPath("~/Content/favicon/site.webmanifest");
            if (System.IO.File.Exists(manifestPath))
            {
                Response.ContentType = "application/manifest+json";
                return File(manifestPath, "application/manifest+json");
            }
            return HttpNotFound();
        }
        [HttpGet]
        public ActionResult ProductDetail(string id)
        {
            // Đảm bảo response encoding là UTF-8
            Response.ContentType = "text/html; charset=utf-8";
            Response.Charset = "utf-8";
            
            ViewBag.ProductId = id;
            return View("ProductDetail");
        }

        // GET: Home/ImportProducts
        // Import dữ liệu từ JSON vào SQL Server (chạy 1 lần)
        public ActionResult ImportProducts()
        {
            try
            {
                // Đọc file JSON
                string jsonPath = Server.MapPath("~/App_Data/products.json");
                if (!System.IO.File.Exists(jsonPath))
                {
                    return Content("File products.json không tồn tại tại: " + jsonPath);
                }

                string jsonContent = System.IO.File.ReadAllText(jsonPath);
                var productsData = JsonConvert.DeserializeObject<Dictionary<string, List<dynamic>>>(jsonContent);

                if (productsData == null)
                {
                    return Content("Không thể đọc dữ liệu từ products.json");
                }

                int importedCount = 0;
                int updatedCount = 0;

                foreach (var category in productsData.Keys)
                {
                    foreach (var item in productsData[category])
                    {
                        string productId = item.id?.ToString() ?? "";

                        if (string.IsNullOrEmpty(productId))
                            continue;

                        // Kiểm tra sản phẩm đã tồn tại chưa
                        var existingProduct = db.Products.FirstOrDefault(p => p.ProductId == productId);

                        // Convert images và tags sang JSON string
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

                return Content($"Import thành công!<br/>" +
                             $"Sản phẩm mới: {importedCount}<br/>" +
                             $"Sản phẩm cập nhật: {updatedCount}<br/>" +
                             $"<a href='/Home/Index'>Về trang chủ</a>");
            }
            catch (Exception ex)
            {
                return Content($"Lỗi: {ex.Message}<br/>{ex.StackTrace}");
            }
        }

        // GET: Home/GetProductDetail
        // Trả về chi tiết 1 sản phẩm theo ID
        public ActionResult GetProductDetail(string id)
        {
            try
            {
                if (string.IsNullOrEmpty(id))
                {
                    return Json(new { error = "Product ID is required" }, JsonRequestBehavior.AllowGet);
                }

                var product = db.Products.FirstOrDefault(p => p.ProductId == id);
                if (product == null)
                {
                    return Json(new { error = "Product not found" }, JsonRequestBehavior.AllowGet);
                }

                // Parse Images và Tags từ JSON string
                List<string> images = new List<string>();
                List<string> tags = new List<string>();

                if (!string.IsNullOrEmpty(product.Images))
                {
                    try
                    {
                        images = JsonConvert.DeserializeObject<List<string>>(product.Images);
                    }
                    catch { }
                }

                if (!string.IsNullOrEmpty(product.Tags))
                {
                    try
                    {
                        tags = JsonConvert.DeserializeObject<List<string>>(product.Tags);
                    }
                    catch
                    {
                        tags = product.Tags.Split(',').Select(t => t.Trim()).ToList();
                    }
                }

                // Lấy Description và Specs từ database
                var description = db.ProductDescriptions.FirstOrDefault(d => d.ProductId == id);
                var spec = db.ProductSpecs.FirstOrDefault(s => s.ProductId == id);

                List<string> descriptionList = new List<string>();
                Dictionary<string, string> specsDict = new Dictionary<string, string>();

                if (description != null && !string.IsNullOrEmpty(description.DescriptionHtml))
                {
                    try
                    {
                        descriptionList = JsonConvert.DeserializeObject<List<string>>(description.DescriptionHtml);
                    }
                    catch { }
                }

                if (spec != null && !string.IsNullOrEmpty(spec.SpecsJson))
                {
                    try
                    {
                        specsDict = JsonConvert.DeserializeObject<Dictionary<string, string>>(spec.SpecsJson);
                    }
                    catch { }
                }

                var result = new
                {
                    id = product.ProductId,
                    title = product.Title,
                    link = product.Link,
                    image = product.Image,
                    images = images,
                    tags = tags,
                    price = product.Price,
                    oldPrice = product.OldPrice,
                    discount = product.Discount,
                    score = product.Score,
                    sold = product.Sold,
                    category = product.Category,
                    description = descriptionList,
                    specs = specsDict
                };

                return Json(result, JsonRequestBehavior.AllowGet);
            }
            catch (Exception ex)
            {
                return Json(new { error = ex.Message }, JsonRequestBehavior.AllowGet);
            }
        }

        // GET: Home/GetProductDescription
        // Trả về mô tả sản phẩm
        public ActionResult GetProductDescription(string id)
        {
            try
            {
                if (string.IsNullOrEmpty(id))
                {
                    return Json(new { error = "Product ID is required" }, JsonRequestBehavior.AllowGet);
                }

                var description = db.ProductDescriptions.FirstOrDefault(d => d.ProductId == id);
                if (description == null)
                {
                    return Json(new { description = new List<string>() }, JsonRequestBehavior.AllowGet);
                }

                List<string> descriptionList = new List<string>();
                if (!string.IsNullOrEmpty(description.DescriptionHtml))
                {
                    try
                    {
                        descriptionList = JsonConvert.DeserializeObject<List<string>>(description.DescriptionHtml);
                    }
                    catch { }
                }

                return Json(new { description = descriptionList }, JsonRequestBehavior.AllowGet);
            }
            catch (Exception ex)
            {
                return Json(new { error = ex.Message }, JsonRequestBehavior.AllowGet);
            }
        }

        // GET: Home/GetProductSpecs
        // Trả về thông số sản phẩm
        public ActionResult GetProductSpecs(string id)
        {
            try
            {
                if (string.IsNullOrEmpty(id))
                {
                    return Json(new { error = "Product ID is required" }, JsonRequestBehavior.AllowGet);
                }

                var spec = db.ProductSpecs.FirstOrDefault(s => s.ProductId == id);
                if (spec == null)
                {
                    return Json(new { specs = new Dictionary<string, string>() }, JsonRequestBehavior.AllowGet);
                }

                Dictionary<string, string> specsDict = new Dictionary<string, string>();
                if (!string.IsNullOrEmpty(spec.SpecsJson))
                {
                    try
                    {
                        specsDict = JsonConvert.DeserializeObject<Dictionary<string, string>>(spec.SpecsJson);
                    }
                    catch { }
                }

                return Json(new { specs = specsDict }, JsonRequestBehavior.AllowGet);
            }
            catch (Exception ex)
            {
                return Json(new { error = ex.Message }, JsonRequestBehavior.AllowGet);
            }
        }

        // GET: Home/GetProducts
        // Trả về tất cả sản phẩm dưới dạng JSON (tương thích với code JavaScript hiện tại)
        public ActionResult GetProducts(string category = null)
        {
            try
            {
                // Kiểm tra database connection
                if (db == null)
                {
                    return Json(new { error = "Database connection failed" }, JsonRequestBehavior.AllowGet);
                }

                IQueryable<Product> query = db.Products;

                // Lọc theo category nếu có
                if (!string.IsNullOrEmpty(category))
                {
                    query = query.Where(p => p.Category == category);
                }

                var products = query.ToList();
                
                // Nếu không có sản phẩm, trả về object rỗng thay vì null
                if (products == null || products.Count == 0)
                {
                    return Json(new Dictionary<string, List<object>>(), JsonRequestBehavior.AllowGet);
                }

                // Mapping từ Category name sang slide key (để tương thích với app.js)
                var categoryToSlideMap = new Dictionary<string, string>
                {
                    { "PC", "slide7" },
                    { "Laptop", "slide8" },
                    { "Màn hình", "slide9" },
                    { "Ram", "slide10" },
                    { "VGA", "slide11" },
                    { "Bàn phím", "slide12" },
                    { "Chuột", "slide12" }, // Chuột có thể dùng chung với Bàn phím hoặc tạo slide riêng
                    { "Mac", "slide1" }, // Mac có thể dùng slide1-6, tạm thời dùng slide1
                    { "Thiết bị Mạng", "slide6" },
                    { "Khác", "slide6" }
                };

                // Chuyển đổi sang format giống JSON gốc (theo category)
                var result = new Dictionary<string, List<object>>();

                foreach (var product in products)
                {
                    // Xử lý category null hoặc rỗng
                    string productCategory = string.IsNullOrEmpty(product.Category) ? "slide1" : product.Category;
                    
                    // Map category name sang slide key nếu có mapping
                    string slideKey = productCategory;
                    if (categoryToSlideMap.ContainsKey(productCategory))
                    {
                        slideKey = categoryToSlideMap[productCategory];
                    }
                    // Nếu category đã là slide key (slide1, slide2, ...) thì giữ nguyên
                    else if (productCategory.StartsWith("slide"))
                    {
                        slideKey = productCategory;
                    }
                    // Nếu không có mapping, mặc định là slide1
                    else
                    {
                        slideKey = "slide1";
                    }
                    
                    if (!result.ContainsKey(slideKey))
                    {
                        result[slideKey] = new List<object>();
                    }

                    // Parse Images và Tags từ JSON string
                    List<string> images = new List<string>();
                    List<string> tags = new List<string>();

                    if (!string.IsNullOrEmpty(product.Images))
                    {
                        try
                        {
                            images = JsonConvert.DeserializeObject<List<string>>(product.Images);
                        }
                        catch { }
                    }

                    if (!string.IsNullOrEmpty(product.Tags))
                    {
                        try
                        {
                            tags = JsonConvert.DeserializeObject<List<string>>(product.Tags);
                        }
                        catch
                        {
                            // Nếu không phải JSON, thử split bằng comma
                            tags = product.Tags.Split(',').Select(t => t.Trim()).ToList();
                        }
                    }

                    result[slideKey].Add(new
                    {
                        id = product.ProductId,
                        title = product.Title,
                        link = product.Link,
                        image = product.Image,
                        images = images,
                        tags = tags,
                        price = product.Price,
                        oldPrice = product.OldPrice,
                        discount = product.Discount,
                        score = product.Score,
                        sold = product.Sold
                    });
                }

                return Json(result, JsonRequestBehavior.AllowGet);
            }
            catch (Exception ex)
            {
                // Log lỗi và trả về JSON error thay vì HTML
                System.Diagnostics.Debug.WriteLine($"GetProducts Error: {ex.Message}\n{ex.StackTrace}");
                return Json(new { 
                    error = ex.Message,
                    stackTrace = ex.StackTrace,
                    innerException = ex.InnerException?.Message
                }, JsonRequestBehavior.AllowGet);
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
