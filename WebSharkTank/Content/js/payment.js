(function paymentInit() {
    if (window.__PAYMENT_INITED__) return;
    window.__PAYMENT_INITED__ = true;

    const days = [
        "Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư",
        "Thứ Năm", "Thứ Sáu", "Thứ Bảy"
    ];

    function formatDate(date) {
        return `${days[date.getDay()]}, ngày ${date.getDate()} tháng ${date.getMonth() + 1} năm ${date.getFullYear()}`;
    }

    const today = new Date();
    const after2 = new Date();
    after2.setDate(today.getDate() + 2);

    // Nội dung tiếng Việt
    const text = `1. Vận chuyển, đến vào khoảng thời gian từ ${formatDate(today)} — ${formatDate(after2)}`;

    const headingEl = document.querySelector(".cart-info__heading--lv2");
    if (headingEl) {
        headingEl.innerText = text;
    }

    // ===== Helpers =====
    // Sử dụng CART_KEY đã được khai báo ở file khác (app.js), không khai báo lại
    // Chỉ đảm bảo window.CART_KEY tồn tại, không khai báo const
    if (typeof window.CART_KEY === 'undefined') {
        window.CART_KEY = "cart";
    }
    
    // Lưu cart items từ SQL
    let cartItemsFromSQL = [];
    
    // Lấy cart items từ SQL
    const loadCartFromSQL = async () => {
        try {
            const response = await fetch('/Cart/GetCart', {
                cache: 'no-cache',
                headers: { 'Cache-Control': 'no-cache' }
            });
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.items) {
                    cartItemsFromSQL = data.items;
                    console.log('[Payment] Loaded cart from SQL:', cartItemsFromSQL.length, 'items');
                    return cartItemsFromSQL;
                }
            }
        } catch (error) {
            console.error('[Payment] Error loading cart from SQL:', error);
        }
        return [];
    };
    
    // Lấy selected items từ localStorage (đã được lưu từ Shipping page)
    const getSelectedItems = () => {
        try {
            const selectedItemsJson = localStorage.getItem('selectedItems');
            if (selectedItemsJson) {
                return JSON.parse(selectedItemsJson);
            }
        } catch (error) {
            console.error('[Payment] Error parsing selected items:', error);
        }
        return [];
    };
    
    // Lấy cart items đã chọn từ SQL (filter theo selectedItems)
    const getCart = () => {
        // Nếu có selectedItems trong localStorage, filter cartItemsFromSQL
        const selectedItems = getSelectedItems();
        if (selectedItems.length > 0 && cartItemsFromSQL.length > 0) {
            const selectedIds = selectedItems.map(item => String(item.id || item.Id || item['id']));
            return cartItemsFromSQL.filter(item => selectedIds.includes(String(item.id)));
        }
        // Nếu không có selectedItems, dùng tất cả items từ SQL
        return cartItemsFromSQL;
    };
    
    const formatMoney = (n) =>
        (n || 0).toLocaleString("vi-VN", { style: "currency", currency: "VND" });

    // Node refs
    const elOrderItemCount = document.getElementById("orderItemCount");
    const elSumItemsQty = document.getElementById("sumItemsQty");
    const elSumSubtotal = document.getElementById("sumSubtotal");
    const elSumShipping = document.getElementById("sumShipping");
    const elSumEstimated = document.getElementById("sumEstimated");
    const elSumPay = document.getElementById("sumPay");
    const elPayBtn = document.getElementById("payBtn");

    function getSubtotal() {
        const items = getCart();
        return items.reduce((s, it) => s + (Number(it.price) || 0) * (Number(it.qty) || 0), 0);
    }
    function getItemCount() {
        const items = getCart();
        return items.reduce((s, it) => s + (Number(it.qty) || 0), 0);
    }
    function getSelectedShipping() {
        // Phương thức vận chuyển đã bị xóa, mặc định free shipping
        return 0;
    }

    function updateSummary() {
        const qty = getItemCount();
        const subtotal = getSubtotal();
        const ship = 0; // Free shipping (phương thức vận chuyển đã bị xóa)
        const estimated = subtotal + ship;

        if (elOrderItemCount) elOrderItemCount.textContent = qty;
        if (elSumItemsQty) elSumItemsQty.textContent = qty;
        if (elSumSubtotal) elSumSubtotal.textContent = formatMoney(subtotal);
        if (elSumShipping) elSumShipping.textContent = ship === 0 ? "Free" : formatMoney(ship);
        if (elSumEstimated) elSumEstimated.textContent = formatMoney(estimated);
        if (elSumPay) elSumPay.textContent = formatMoney(estimated);

        // Optional: disable Pay khi giỏ trống
        if (elPayBtn) {
            if (qty === 0) {
                elPayBtn.classList.add("btn--disabled");
                elPayBtn.setAttribute("aria-disabled", "true");
            } else {
                elPayBtn.classList.remove("btn--disabled");
                elPayBtn.removeAttribute("aria-disabled");
            }
        }
    }

    // Expose updateSummary để có thể gọi từ bên ngoài
    window.updatePaymentSummary = updateSummary;

    // Init on load - Load cart từ SQL trước, sau đó update summary
    const initPayment = async () => {
        await loadCartFromSQL();
        updateSummary();
    };
    
    if (document.readyState === 'loading') {
        document.addEventListener("DOMContentLoaded", initPayment);
    } else {
        initPayment();
    }
})();
