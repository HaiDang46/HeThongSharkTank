using System.Web.Mvc;
using System.Web.Routing;

namespace WebSharkTank
{
    public class RouteConfig
    {
        public static void RegisterRoutes(RouteCollection routes)
        {
            routes.IgnoreRoute("{resource}.axd/{*pathInfo}");

            // Bật attribute routing: [Route], [RoutePrefix]
            routes.MapMvcAttributeRoutes();

            // Route mặc định
            // Redirect từ các link cũ
            routes.MapRoute(
                name: "SignInRedirect",
                url: "sign-in.html",
                defaults: new { controller = "Home", action = "SignIn" }
            );

            routes.MapRoute(
                name: "SignUpRedirect",
                url: "sign-up.html",
                defaults: new { controller = "Home", action = "SignUp" }
            );

            routes.MapRoute(
                name: "ProfileRedirect",
                url: "profile.html",
                defaults: new { controller = "Profile", action = "Index" }
            );

            // Route cho webmanifest
            routes.MapRoute(
                name: "WebManifest",
                url: "Content/favicon/site.webmanifest",
                defaults: new { controller = "Home", action = "WebManifest" }
            );

            // Route cho Admin GetOrderDetail
            routes.MapRoute(
                name: "AdminGetOrderDetail",
                url: "Admin/GetOrderDetail/{id}",
                defaults: new { controller = "Admin", action = "GetOrderDetail", id = UrlParameter.Optional }
            );

            routes.MapRoute(
                name: "Default",
                url: "{controller}/{action}/{id}",
                defaults: new { controller = "Home", action = "Index", id = UrlParameter.Optional }
            );
        }
    }
}
