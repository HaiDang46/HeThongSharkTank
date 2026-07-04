// assets/js/cart.js
(() => {
  // Helpers
  const toNumberVND = (s) => parseInt(String(s || '').replace(/[^\d]/g, ''), 10) || 0;
  const moneyVND = (n) => (n || 0).toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });

  const CART_KEY = window.CART_KEY || 'cart';
  window.CART_KEY = CART_KEY;
  const cartStore = {
    get() { try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch { return []; } },
    set(c) { localStorage.setItem(CART_KEY, JSON.stringify(c)); },
    add(item) {
      const c = this.get();
      const i = c.findIndex(x => x.id === item.id);
      if (i > -1) c[i].qty += item.qty || 1;
      else c.push({ ...item, qty: item.qty || 1 });
      this.set(c);
    },
    update(id, delta) {
      const c = this.get();
      const i = c.findIndex(x => x.id === id);
      if (i === -1) return;
      const next = c[i].qty + delta;
      if (next <= 0) c.splice(i, 1);
      else c[i].qty = next;
      this.set(c);
    },
    remove(id) { this.set(this.get().filter(x => x.id !== id)); },
    count() { return this.get().reduce((s, x) => s + x.qty, 0); },
    subtotal() { return this.get().reduce((s, x) => s + x.price * x.qty, 0); }
  };

  const TAX_RATE = 0;
  const SHIPPING_FLAT = 0;

  function renderMiniCart() {
    const elList = document.getElementById('miniCartList');
    const elCount = document.getElementById('miniCount');
    const elCountTop = document.getElementById('cartCount');
    const elSubtotal = document.getElementById('subtotal');
    const elTax = document.getElementById('tax');
    const elShip = document.getElementById('ship');
    const elGrand = document.getElementById('grand');

    const items = cartStore.get();
    const count = cartStore.count();

    if (elCount) elCount.textContent = count;
    if (elCountTop) elCountTop.textContent = count;

    const subtotal = cartStore.subtotal();
    const tax = Math.round(subtotal * TAX_RATE);
    const ship = items.length ? SHIPPING_FLAT : 0;
    const grand = subtotal + tax + ship;

    if (elSubtotal) elSubtotal.textContent = moneyVND(subtotal);
    if (elTax) elTax.textContent = moneyVND(tax);
    if (elShip) elShip.textContent = moneyVND(ship);
    if (elGrand) elGrand.textContent = moneyVND(grand);

    if (!elList) return;

    if (!items.length) {
      elList.innerHTML = `
        <div class="col" style="width:100%">
          <p style="padding:8px 0;color:#666">Giỏ hàng trống</p>
        </div>`;
      return;
    }

    elList.innerHTML = items.map(item => `
      <div class="col">
        <article class="cart-preview-item" data-id="${item.id}">
          <div class="cart-preview-item__img-wrap">
            <img src="${item.img}" alt class="cart-preview-item__thumb" />
          </div>
          <h3 class="cart-preview-item__title" title="${item.name}">${item.name}</h3>
          <p class="cart-preview-item__price">${moneyVND(item.price)}</p>

          <div class="mini-qty" style="display:flex;gap:6px;align-items:center;margin-top:6px">
            <button type="button" class="btn-qty" data-action="dec" data-id="${item.id}">-</button>
            <span>${item.qty}</span>
            <button type="button" class="btn-qty" data-action="inc" data-id="${item.id}">+</button>
          </div>

          <button type="button" class="mini-remove" data-action="remove" data-id="${item.id}"
                  style="margin-top:6px;color:#c00;background:none;border:0;cursor:pointer">Xóa</button>
        </article>
      </div>
    `).join('');
  }

  document.addEventListener('click', (e) => {
    const addBtn = e.target.closest('.btn-add-cart');
    if (!addBtn) return;
    
    // Bỏ qua button trong ProductDetail (có class prod-info__add-to-cart)
    // Vì product-detail.js đã xử lý riêng
    if (addBtn.classList.contains('prod-info__add-to-cart')) {
      return;
    }
    const card = addBtn.closest('.product-card');
    const product = {
      id: (card?.dataset.id || '').trim(),
      name: card?.dataset.name,
      price: toNumberVND(card?.dataset.price),
      img: card?.dataset.img,
      qty: 1
    };
    if (!product.id) return;
    e.stopPropagation();
    
    // Check user đã đăng nhập
    const currentUser = window.Auth?.getCurrentUser?.() || null;
    
    if (!currentUser || !currentUser.id) {
      // Chưa đăng nhập: Lưu vào localStorage
      cartStore.add(product);
      renderMiniCart();
      swal({
        title: "Thành công!",
        text: "Đã thêm sản phẩm vào giỏ hàng",
        icon: "success",
        button: "OK"
      });
      return;
    }
    
    // Đã đăng nhập: CHỈ lưu vào SQL, KHÔNG lưu vào localStorage
    (async () => {
      try {
        const token = document.querySelector('input[name="__RequestVerificationToken"]')?.value;
        if (!token) {
          console.warn('[cart] Không có AntiForgeryToken');
          return;
        }
        
        const response = await fetch('/Cart/AddItem', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: `productId=${encodeURIComponent(product.id)}&productName=${encodeURIComponent(product.name || '')}&price=${product.price}&productImage=${encodeURIComponent(product.img || '')}&quantity=${product.qty || 1}&__RequestVerificationToken=${encodeURIComponent(token)}`
        });
        const result = await response.json();
        if (result.success) {
          console.log('[cart] Đã lưu vào SQL (không lưu localStorage):', product.name);
          // Hiển thị SweetAlert thông báo thành công
          swal({
            title: "Thành công!",
            text: "Đã thêm sản phẩm vào giỏ hàng",
            icon: "success",
            button: "OK"
          });
          // Reload cart từ server để hiển thị
          setTimeout(() => {
            if (window.Auth?.getCurrentUser?.()) {
              syncCartFromServer();
            }
          }, 100);
        } else {
          console.warn('[cart] Lỗi lưu vào SQL:', result.message);
          // Hiển thị thông báo lỗi bằng SweetAlert
          swal({
            title: "Lỗi!",
            text: result.message || "Có lỗi xảy ra khi thêm vào giỏ hàng",
            icon: "error",
            button: "OK"
          });
        }
      } catch (e) {
        console.warn('[cart] Lỗi sync server:', e);
      }
    })();
  });

  const toggleBtn = document.getElementById('cartToggle');
  const miniCart = document.getElementById('miniCart');

  miniCart?.addEventListener('click', (e) => {
    e.stopPropagation();
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const { action, id } = btn.dataset;
    if (!id) return;
    const currentUser = window.Auth?.getCurrentUser?.() || null;
    
    if (!currentUser || !currentUser.id) {
      // Chưa đăng nhập: CHỈ update localStorage
      if (action === 'dec') cartStore.update(id, -1);
      else if (action === 'inc') cartStore.update(id, +1);
      else if (action === 'remove') cartStore.remove(id);
      renderMiniCart();
      return;
    }
    
    // Đã đăng nhập: CHỈ update SQL, KHÔNG update localStorage
    const token = document.querySelector('input[name="__RequestVerificationToken"]')?.value;
    if (!token) return;
    
    if (action === 'dec' || action === 'inc') {
      const localItem = cartStore.get().find(x => x.id === id);
      const newQty = localItem ? (localItem.qty + (action === 'dec' ? -1 : +1)) : (action === 'dec' ? 0 : 1);
      
      if (newQty <= 0) {
        // Xóa khỏi SQL
        (async () => {
          try {
            const response = await fetch('/Cart/RemoveItem', {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: `productId=${encodeURIComponent(id)}&__RequestVerificationToken=${encodeURIComponent(token)}`
            });
            if (response.ok) {
              const result = await response.json();
              if (result.success) {
                console.log('[cart] Đã xóa khỏi SQL:', id);
                // Reload cart từ SQL và render ngay
                await syncCartFromServer();
                if (window.renderMiniCart) {
                  window.renderMiniCart();
                }
              } else {
                console.warn('[cart] Lỗi xóa khỏi SQL:', result.message);
              }
            }
          } catch (e) {
            console.warn('[cart] Lỗi xóa khỏi SQL:', e);
          }
        })();
      } else {
        // Update SQL
        (async () => {
          try {
            const response = await fetch('/Cart/UpdateItem', {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: `productId=${encodeURIComponent(id)}&quantity=${newQty}&__RequestVerificationToken=${encodeURIComponent(token)}`
            });
            if (response.ok) {
              const result = await response.json();
              if (result.success) {
                console.log('[cart] Đã cập nhật SQL:', id, 'qty:', newQty);
                // Reload cart từ SQL và render ngay
                await syncCartFromServer();
                if (window.renderMiniCart) {
                  window.renderMiniCart();
                }
              } else {
                console.warn('[cart] Lỗi cập nhật SQL:', result.message);
              }
            }
          } catch (e) {
            console.warn('[cart] Lỗi update SQL:', e);
          }
        })();
      }
    } else if (action === 'remove') {
      // Xóa khỏi SQL
      (async () => {
        try {
          const response = await fetch('/Cart/RemoveItem', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `productId=${encodeURIComponent(id)}&__RequestVerificationToken=${encodeURIComponent(token)}`
          });
          if (response.ok) {
            const result = await response.json();
            if (result.success) {
              console.log('[cart] Đã xóa khỏi SQL:', id);
              // Reload cart từ SQL và render ngay
              await syncCartFromServer();
              if (window.renderMiniCart) {
                window.renderMiniCart();
              }
            } else {
              console.warn('[cart] Lỗi xóa khỏi SQL:', result.message);
            }
          }
        } catch (e) {
          console.warn('[cart] Lỗi xóa khỏi SQL:', e);
        }
      })();
    }
  });

  miniCart?.addEventListener('pointerdown', (e) => {
    if (e.target.closest('[data-action]')) e.stopPropagation();
  });

  toggleBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    miniCart?.classList.toggle('is-open');
  });
  miniCart?.addEventListener('click', (e) => e.stopPropagation());
  document.addEventListener('click', () => miniCart?.classList.remove('is-open'));

  // ============ Cart Sync Helper ============
  async function syncCartFromServer() {
    try {
      const currentUser = window.Auth?.getCurrentUser?.() || null;
      if (!currentUser || !currentUser.id) {
        return;
      }

      const response = await fetch('/Cart/GetCart', {
        cache: 'no-cache',
        headers: { 'Cache-Control': 'no-cache' }
      });

      if (!response.ok) return;

      const data = await response.json();
      if (data.success && Array.isArray(data.items)) {
        // Khi đăng nhập: CHỈ dùng cart từ SQL, thay thế localStorage hoàn toàn
        const serverCart = data.items;
        cartStore.set(serverCart);
        renderMiniCart();
        console.log('[cart] Đã sync cart từ SQL:', serverCart.length, 'items');
      } else {
        // Server cart trống, clear localStorage
        cartStore.set([]);
        renderMiniCart();
      }
    } catch (e) {
      console.warn('[cart] Lỗi sync cart:', e);
    }
  }
  
  // Expose để gọi từ bên ngoài
  window.syncCartFromServer = syncCartFromServer;

  document.addEventListener('DOMContentLoaded', renderMiniCart);

  window.cartStore = cartStore;
  window.renderMiniCart = renderMiniCart;
  window.moneyVND = moneyVND;
  window.toNumberVND = toNumberVND;
  if (!window.__buyNowBound) {
    window.__buyNowBound = true;

    document.addEventListener('click', function (e) {
      const buyBtn = e.target.closest('.btn--primary-red.prod-info__buy');
      if (!buyBtn) return;
      e.preventDefault();

      const name = (document.getElementById('prod-title')?.textContent || '').trim() || 'Sản phẩm';
      const priceText =
        document.getElementById('total-price')?.textContent ||
        document.getElementById('price')?.textContent || '0';
      const price = toNumberVND(priceText); 
      const qty = parseInt(document.getElementById('detailQty')?.value, 10) || 1;
      const img = document.querySelector('.prod-preview__list img, .prod-preview img')?.src || '';

      const id = new URLSearchParams(location.search).get('id') ||
        document.querySelector('[data-product-id]')?.dataset.productId ||
        name;

      cartStore.add({ id, name, price, img, qty });
      renderMiniCart();

      const goto = buyBtn.dataset.goto;
      if (goto === 'checkout') location.href = '/Checkout';
      else if (goto === 'cart') location.href = '/Checkout';
      else document.getElementById('miniCart')?.classList.add('is-open'); 
    });
  }

})();
