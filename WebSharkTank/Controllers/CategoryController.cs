using System.Web.Mvc;

namespace WebSharkTank.Controllers
{
    public class CategoryController : Controller
    {
        // GET: Category
        public ActionResult Index(string type = null)
        {
            // Pass type parameter to view for filtering
            ViewBag.Type = type;
            return View();
        }
    }
}

