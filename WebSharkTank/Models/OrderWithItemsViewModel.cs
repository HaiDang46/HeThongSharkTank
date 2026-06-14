using System;
using System.Collections.Generic;

namespace WebSharkTank.Models
{
    // ViewModel cho đơn hàng kèm order items
    public class OrderWithItemsViewModel
    {
        public Order Order { get; set; }
        public List<OrderItem> OrderItems { get; set; }
        public string FullAddress { get; set; }
        public string UserName { get; set; }
        public string UserEmail { get; set; }
    }
}

