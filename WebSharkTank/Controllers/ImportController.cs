using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Web.Mvc;
using WebSharkTank.Models;
using Newtonsoft.Json;

namespace WebSharkTank.Controllers
{
    public class ImportController : Controller
    {
        // GET: Import/ImportProducts
        // Action này để import dữ liệu từ JSON vào SQL Server
        // Chỉ chạy 1 lần hoặc khi cần update
        public ActionResult ImportProducts()
        {
            try
            {
                var db = new AppDbContext();

                // Đọc file JSON
                string jsonPath = Server.MapPath("~/App_Data/products.json");
                if (!System.IO.File.Exists(jsonPath))
                {
                    return Content("File products.json không tồn tại!");
                }

                string jsonContent = System.IO.File.ReadAllText(jsonPath);
                var productsData = JsonConvert.DeserializeObject<Dictionary<string, List<dynamic>>>(jsonContent);

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
                db.Dispose();

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
    }
}

