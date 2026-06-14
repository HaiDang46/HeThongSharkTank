using System;
using System.Collections.Generic;
using System.Linq;
using System.Web.Mvc;
using WebSharkTank.Models;
using Newtonsoft.Json;

namespace WebSharkTank.Controllers
{
    public class ProductController : Controller
    {
        private AppDbContext db = new AppDbContext();

        // GET: Product/GetProducts
        // Trả về tất cả sản phẩm dưới dạng JSON
        public ActionResult GetProducts(string category = null)
        {
            try
            {
                IQueryable<Product> query = db.Products;

                // Lọc theo category nếu có
                if (!string.IsNullOrEmpty(category))
                {
                    query = query.Where(p => p.Category == category);
                }

                var products = query.ToList();

                // Chuyển đổi sang format giống JSON gốc (theo category)
                var result = new Dictionary<string, List<object>>();

                foreach (var product in products)
                {
                    if (!result.ContainsKey(product.Category))
                    {
                        result[product.Category] = new List<object>();
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

                    result[product.Category].Add(new
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
                return Json(new { error = ex.Message }, JsonRequestBehavior.AllowGet);
            }
        }

        // GET: Product/GetDetail?id=xxx
        public ActionResult GetDetail(string id)
        {
            try
            {
                var product = db.Products.FirstOrDefault(p => p.ProductId == id);

                if (product == null)
                {
                    return Json(new { error = "Product not found" }, JsonRequestBehavior.AllowGet);
                }

                // Parse Images và Tags
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
                    category = product.Category
                };

                return Json(result, JsonRequestBehavior.AllowGet);
            }
            catch (Exception ex)
            {
                return Json(new { error = ex.Message }, JsonRequestBehavior.AllowGet);
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

