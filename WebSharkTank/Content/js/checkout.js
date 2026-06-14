(function checkoutInit() {

    if (window.__CHECKOUT_INITED__) return;
    window.__CHECKOUT_INITED__ = true;

    console.log("[checkout] Init");

    const CART_KEY = window.CART_KEY || "cart";
    window.CART_KEY = CART_KEY;
    const SHIPPING_FLAT = 0;

    const moneyVND = (n) =>
        (n || 0).toLocaleString("vi-VN", {
            style: "currency",
            currency: "VND",
        });

    const cartStore = {
        get() {
            try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
            catch { return []; }
        },
        set(c) { localStorage.setItem(CART_KEY, JSON.stringify(c)); },
        update(id, delta) {
            const c = this.get();
            const i = c.findIndex(x => String(x.id) === String(id));
            if (i === -1) return;
            const next = (c[i].qty || 0) + delta;
            if (next <= 0) c.splice(i, 1);
            else c[i].qty = next;
            this.set(c);
        },
        remove(id) {
            this.set(this.get().filter(x => String(x.id) !== String(id)));
        },
        subtotal() {
            return this.get().reduce((s, x) => s + x.price * x.qty, 0);
        },
        count() {
            return this.get().reduce((s, x) => s + x.qty, 0);
        }
    };

    const list = document.querySelector(".cart-info__list");

    const elItems = document.getElementById("coSubtotalItems");
    const elSub = document.getElementById("coSubtotalPrice");
    const elShip = document.getElementById("coShipping");
    const elTotal = document.getElementById("coEstimatedTotal");

    const elSubM = document.getElementById("coSubtotalMobile");
    const elShipM = document.getElementById("coShippingMobile");
    const elTotalM = document.getElementById("coTotalMobile");

    if (!list) {
        // Not on checkout page, silently return
        return;
    }

    function itemHTML(it) {
        const totalItem = it.price * it.qty;
        return `
  <article class="cart-item" data-id="${it.id}">
    <a href="/Home/ProductDetail?id=${encodeURIComponent(it.id)}">
      <img src="${it.img}" alt="" class="cart-item__thumb" />
    </a>
    <div class="cart-item__content">
      <div class="cart-item__content-left">
        <h3 class="cart-item__title">
          <a href="/Home/ProductDetail?id=${encodeURIComponent(it.id)}">${it.name}</a>
        </h3>
        <p class="cart-item__price-wrap">
          ${moneyVND(it.price)} | <span class="cart-item__status">In Stock</span>
        </p>
        <div class="cart-item__ctrl cart-item__ctrl--md-block">
          <div class="cart-item__input">
            <button type="button" class="cart-item__input-btn js-qty" data-action="dec" data-id="${it.id}">
              <img class="icon" src="${window.appConfig?.contentPath || '/Content'}/icons/minus.svg" alt="" />
            </button>
            <span>${it.qty}</span>
            <button type="button" class="cart-item__input-btn js-qty" data-action="inc" data-id="${it.id}">
              <img class="icon" src="${window.appConfig?.contentPath || '/Content'}/icons/plus.svg" alt="" />
            </button>
          </div>
        </div>
      </div>
      <div class="cart-item__content-right">
        <p class="cart-item__total-price">${moneyVND(totalItem)}</p>
        <div class="cart-item__ctrl">
          <button type="button"
        class="cart-item__ctrl-btn"
        data-action="remove"
        data-id="${String(it.id).trim()}">
   <img src="${window.appConfig?.contentPath || '/Content'}/icons/trash.svg" alt="" />
  Delete
</button>


        </div>
      </div>
    </div>
  </article>`;
    }

    function render() {
        const cart = cartStore.get();

        if (!cart.length) {
            list.innerHTML =
                `<p style="padding:12px 0;color:#666">Giỏ hàng trống.</p>`;
        } else {
            list.innerHTML = cart.map(itemHTML).join("");
        }

        const subtotal = cartStore.subtotal();
        const shipping = cart.length ? SHIPPING_FLAT : 0;
        const total = subtotal + shipping;
        const count = cartStore.count();

        if (elItems) elItems.textContent = count;
        if (elSub) elSub.textContent = moneyVND(subtotal);
        if (elShip) elShip.textContent = moneyVND(shipping);
        if (elTotal) elTotal.textContent = moneyVND(total);

        if (elSubM) elSubM.textContent = moneyVND(subtotal);
        if (elShipM) elShipM.textContent = moneyVND(shipping);
        if (elTotalM) elTotalM.textContent = moneyVND(total);
    }

    // Hàm kiểm tra đăng nhập
    async function checkLogin() {
        try {
            const response = await fetch('/Account/GetCurrentUser', {
                cache: 'no-cache',
                headers: { 'Cache-Control': 'no-cache' }
            });
            if (response.ok) {
                const data = await response.json();
                return data.success && data.authenticated && data.user && data.user.id;
            }
        } catch (error) {
            console.warn('[checkout] Error checking login:', error);
        }
        return false;
    }

    // Hàm cập nhật số lượng lên SQL
    async function updateItemInSQL(productId, quantity) {
        const isLoggedIn = await checkLogin();
        if (!isLoggedIn) {
            console.log('[checkout] User not logged in, skipping SQL update');
            return;
        }

        const token = document.querySelector('input[name="__RequestVerificationToken"]')?.value;
        if (!token) {
            console.warn('[checkout] No AntiForgeryToken found');
            return;
        }

        try {
            const response = await fetch('/Cart/UpdateItem', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: `productId=${encodeURIComponent(productId)}&quantity=${quantity}&__RequestVerificationToken=${encodeURIComponent(token)}`
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    console.log('[checkout] Updated item in SQL:', productId, 'quantity:', quantity);
                } else {
                    console.error('[checkout] Failed to update item in SQL:', result.message);
                }
            } else {
                console.error('[checkout] Server error updating item:', response.status);
            }
        } catch (error) {
            console.error('[checkout] Error updating item in SQL:', error);
        }
    }

    // Hàm xóa sản phẩm khỏi SQL
    async function removeItemFromSQL(productId) {
        const isLoggedIn = await checkLogin();
        if (!isLoggedIn) {
            console.log('[checkout] User not logged in, skipping SQL delete');
            return;
        }

        const token = document.querySelector('input[name="__RequestVerificationToken"]')?.value;
        if (!token) {
            console.warn('[checkout] No AntiForgeryToken found');
            return;
        }

        try {
            const response = await fetch('/Cart/RemoveItem', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: `productId=${encodeURIComponent(productId)}&__RequestVerificationToken=${encodeURIComponent(token)}`
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    console.log('[checkout] Removed item from SQL:', productId);
                } else {
                    console.error('[checkout] Failed to remove item from SQL:', result.message);
                }
            } else {
                console.error('[checkout] Server error removing item:', response.status);
            }
        } catch (error) {
            console.error('[checkout] Error removing item from SQL:', error);
        }
    }

    document.addEventListener("click", async (e) => {
        const btn = e.target.closest("[data-action]");
        if (!btn) return;

        const { action, id } = btn.dataset;

        if (action === "inc") {
            cartStore.update(id, +1);
            const cart = cartStore.get();
            const item = cart.find(x => String(x.id) === String(id));
            if (item) {
                await updateItemInSQL(id, item.qty);
            }
        }
        if (action === "dec") {
            cartStore.update(id, -1);
            const cart = cartStore.get();
            const item = cart.find(x => String(x.id) === String(id));
            if (item) {
                // Nếu item còn tồn tại (qty > 0), cập nhật
                await updateItemInSQL(id, item.qty);
            } else {
                // Nếu item đã bị xóa (qty <= 0), xóa khỏi SQL
                await removeItemFromSQL(id);
            }
        }
        if (action === "remove") {
            cartStore.remove(id);
            await removeItemFromSQL(id);
        }

        render();
        window.renderMiniCart?.();
    });

    document.addEventListener("DOMContentLoaded", render);

})();
