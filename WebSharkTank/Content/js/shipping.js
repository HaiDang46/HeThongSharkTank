function formatDate(date) {
  const days = [
    "Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư",
    "Thứ Năm", "Thứ Sáu", "Thứ Bảy"
  ];
  return `${days[date.getDay()]}, ngày ${date.getDate()} tháng ${date.getMonth() + 1} năm ${date.getFullYear()}`;
}

const today = new Date();       
const after2 = new Date();     
after2.setDate(today.getDate() + 2);

const text = `1. Vận chuyển, đến vào khoảng thời gian từ ${formatDate(today)} đến ${formatDate(after2)} (tối)`;

document.querySelector(".cart-info__heading").innerText = text;
(function initShipping() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initShipping, { once: true });
    return;
  }

  // ===== Cấu hình
  const CART_KEY = window.CART_KEY || 'cart';
  window.CART_KEY = CART_KEY;
  const SHIPPING_FLAT = 0; 

  // ===== Helpers
  const moneyVND = (n) => (n || 0).toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });

  const cartStore = {
    get() { try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch { return []; } },
    set(c) { localStorage.setItem(CART_KEY, JSON.stringify(c)); },
    update(id, delta) {
      const c = this.get();
      const i = c.findIndex(x => x.id === id);
      if (i === -1) return;
      const next = c[i].qty + delta;
      if (next <= 0) c.splice(i, 1); else c[i].qty = next;
      this.set(c);
    },
    remove(id) { this.set(this.get().filter(x => x.id !== id)); },
    subtotal() { return this.get().reduce((s, x) => s + x.price * x.qty, 0); },
    count() { return this.get().reduce((s, x) => s + x.qty, 0); }
  };

  // ===== DOM refs
  const list = document.querySelector('.cart-info__list');

  const elItems = document.getElementById('shipSubtotalItems');
  const elSub = document.getElementById('shipSubtotalPrice');
  const elShip = document.getElementById('shipShipping');
  const elTotal = document.getElementById('shipEstimatedTotal');

  const elSubM = document.getElementById('shipSubtotalMobile');
  const elShipM = document.getElementById('shipShippingMobile');
  const elTotalM = document.getElementById('shipTotalMobile');

  const modal = document.getElementById('delete-confirm');

  if (!list) return;

  // ===== 1 item HTML (khớp CSS hiện có) - thêm checkbox để chọn
  const itemHTML = (it) => {
    const totalItem = it.price * it.qty;
    return `
    <article class="cart-item" data-id="${it.id}">
      <div class="cart-item__checkbox-wrap" style="margin-right: 12px;">
        <label class="cart-info__checkbox">
          <input type="checkbox" name="selected-items" value="${it.id}" class="cart-info__checkbox-input js-select-item" data-id="${it.id}" checked />
        </label>
      </div>
      <a href="/Home/ProductDetail?id=${encodeURIComponent(it.id)}">
        <img src="${it.img}" alt="" class="cart-item__thumb" />
      </a>
      <div class="cart-item__content">
        <div class="cart-item__content-left">
          <h3 class="cart-item__title"><a href="/Home/ProductDetail?id=${encodeURIComponent(it.id)}">${it.name}</a></h3>
          <p class="cart-item__price-wrap">
            ${moneyVND(it.price)} | <span class="cart-item__status">In Stock</span>
          </p>
          <p class="cart-item__qty" style="margin-top: 8px; color: #666;">Số lượng: ${it.qty}</p>
        </div>
        <div class="cart-item__content-right">
          <p class="cart-item__total-price">${moneyVND(totalItem)}</p>
        </div>
      </div>
    </article>`;
  };

  // Load cart từ SQL
  async function loadCartFromSQL() {
    try {
      const response = await fetch('/Cart/GetCart', {
        cache: 'no-cache',
        headers: { 'Cache-Control': 'no-cache' }
      });
      const data = await response.json();
      if (data.success && data.items && data.items.length > 0) {
        // Lưu vào cartStore để render
        cartStore.set(data.items);
        render();
      } else {
        // Không có mặt hàng
        cartStore.set([]);
        render();
      }
    } catch (error) {
      console.error('[shipping] Error loading cart:', error);
      // Fallback: dùng localStorage
      render();
    }
  }

  // Tính tổng chỉ cho các mặt hàng đã chọn
  function getSelectedItems() {
    const checkboxes = document.querySelectorAll('input[name="selected-items"]:checked');
    const selectedIds = Array.from(checkboxes).map(cb => cb.value);
    const cart = cartStore.get();
    return cart.filter(item => selectedIds.includes(String(item.id)));
  }

  function render() {
    const cart = cartStore.get();

    if (!cart.length) {
      list.innerHTML = `<p style="padding:12px 0;color:#666">Giỏ hàng trống.</p>`;
    } else {
      list.innerHTML = cart.map(itemHTML).join('');
    }

    // Tính tổng chỉ cho các mặt hàng đã chọn
    const selectedItems = getSelectedItems();
    const subtotal = selectedItems.reduce((s, x) => s + x.price * x.qty, 0);
    const shipping = selectedItems.length ? SHIPPING_FLAT : 0;
    const total = subtotal + shipping;
    const count = selectedItems.reduce((s, x) => s + x.qty, 0);

    if (elItems) elItems.textContent = count;
    if (elSub) elSub.textContent = moneyVND(subtotal);
    if (elShip) elShip.textContent = moneyVND(shipping);
    if (elTotal) elTotal.textContent = moneyVND(total);

    if (elSubM) elSubM.textContent = moneyVND(subtotal);
    if (elShipM) elShipM.textContent = moneyVND(shipping);
    if (elTotalM) elTotalM.textContent = moneyVND(total);
  }

  // +/-/Delete
  // Sử dụng flag để tránh duplicate event handlers
  // Đã xóa các nút tăng/giảm số lượng và xóa sản phẩm trong trang Shipping
  // Không cần event listener cho các nút này nữa

  // Lắng nghe sự kiện thay đổi checkbox để cập nhật tổng tiền
  list.addEventListener('change', (e) => {
    if (e.target.matches('input[name="selected-items"]')) {
      render();
    }
  });

  // Lưu danh sách mặt hàng đã chọn khi bấm "Tiếp Tục Thanh Toán"
  const nextBtn = document.querySelector('a.cart-info__next-btn[href*="Payment"]');
  if (nextBtn) {
    nextBtn.addEventListener('click', function(e) {
      e.preventDefault();
      
      // Kiểm tra địa chỉ đã được chọn chưa
      const selectedAddress = document.querySelector('input[name="shipping-address"]:checked');
      if (!selectedAddress) {
        if (typeof swal !== 'undefined') {
          swal({
            title: "Cần chọn địa chỉ",
            text: "Vui lòng chọn địa chỉ giao hàng trước khi tiếp tục",
            icon: "warning",
            button: "OK"
          });
        } else {
          alert('Vui lòng chọn địa chỉ giao hàng trước khi tiếp tục');
        }
        return;
      }
      
      const selectedItems = getSelectedItems();
      if (selectedItems.length === 0) {
        if (typeof swal !== 'undefined') {
          swal({
            title: "Cảnh báo",
            text: "Vui lòng chọn ít nhất một mặt hàng để thanh toán",
            icon: "warning",
            button: "OK"
          });
        } else {
          alert('Vui lòng chọn ít nhất một mặt hàng để thanh toán');
        }
        return;
      }

      // Lưu địa chỉ đã chọn vào localStorage
      const addressId = selectedAddress.value || window.__selectedAddressId;
      console.log('[shipping] Saving address and items before navigating to Payment');
      console.log('[shipping] Selected address ID:', addressId);
      console.log('[shipping] Selected items count:', selectedItems.length);
      
      // Lưu addressId vào localStorage
      if (addressId) {
        localStorage.setItem('selectedAddressId', addressId);
        console.log('[shipping] Saved addressId to localStorage:', addressId);
      }
      
      // Lưu selectedItems vào localStorage để Payment page có thể filter
      localStorage.setItem('selectedItems', JSON.stringify(selectedItems));
      console.log('[shipping] Saved selectedItems to localStorage:', selectedItems.length, 'items');
      
      // Lưu danh sách mặt hàng đã chọn vào Session
      const token = jQuery('input[name="__RequestVerificationToken"]').val();
      const url = window.SHIPPING_SET_SELECTED_ITEMS_URL || '/Shipping/SetSelectedItems';
      console.log('[shipping] Calling items URL:', url);
      
      jQuery.ajax({
        url: url,
        type: 'POST',
        data: {
          selectedItems: JSON.stringify(selectedItems),
          __RequestVerificationToken: token || ''
        },
        success: function(response) {
          console.log('[shipping] Items response:', response);
          if (response && response.success) {
            console.log('[shipping] Selected items saved successfully');
            // Chuyển đến trang Payment sau khi đã lưu mặt hàng
            window.location.href = nextBtn.getAttribute('href');
          } else {
            console.error('[shipping] Failed to save selected items:', response && response.message);
            // Vẫn chuyển đến Payment
            window.location.href = nextBtn.getAttribute('href');
          }
        },
        error: function(xhr, status, error) {
          console.error('[shipping] Error saving selected items:', status, error);
          console.error('[shipping] Status code:', xhr.status);
          console.error('[shipping] Response text:', xhr.responseText ? xhr.responseText.substring(0, 500) : 'No response');
          // Vẫn chuyển đến Payment
          window.location.href = nextBtn.getAttribute('href');
        }
      });
    });
  }

  // Load cart từ SQL khi trang load
  loadCartFromSQL();
})();
