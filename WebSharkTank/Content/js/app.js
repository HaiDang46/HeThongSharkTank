
// ============ Cart Sync Helper ============
async function syncCartFromServer() {
  try {
    const currentUser = window.Auth?.getCurrentUser?.() || null;
    if (!currentUser || !currentUser.id) {
      return; // Chưa đăng nhập, không sync
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
      console.log('[app] Đã sync cart từ SQL:', serverCart.length, 'items');
    } else {
      // Server cart trống, clear localStorage
      cartStore.set([]);
      renderMiniCart();
    }
  } catch (e) {
    console.warn('[app] Lỗi sync cart:', e);
  }
}

// Expose để gọi từ bên ngoài
window.syncCartFromServer = syncCartFromServer;

// Chỉ khởi tạo Tabzy nếu container tồn tại
const tabs3Container = document.querySelector("#sliding-tabs");
let tabs3 = null;
if (tabs3Container) {
  tabs3 = new Tabzy("#sliding-tabs", { onChange: updateActiveLine });
}

function updateActiveLine() {
  if (!tabs3 || !tabs3.currentTab) return;
  try {
    const activeTab = tabs3.currentTab;
    if (!activeTab || typeof activeTab.closest !== 'function') return;
    const tabLi = activeTab.closest("li");
    if (!tabLi) return;
    const activeLine = tabs3.container?.nextElementSibling;
    if (!activeLine) return;
    activeLine.style.width = `${tabLi.offsetWidth}px`;
    activeLine.style.transform = `translateX(${tabLi.offsetLeft}px)`;
  } catch (e) {
    console.debug('[app] updateActiveLine error:', e);
  }
}
if (tabs3) {
  updateActiveLine();
}

const sliderMap = {
  "my-slider1": "slide1",
  "my-slider2": "slide2",
  "my-slider3": "slide3",
  "my-slider4": "slide4",
  "my-slider5": "slide5",
  "my-slider6": "slide6",
  "my-slider7": "slide7",
  "my-slider8": "slide8",
  "my-slider9": "slide9",
  "my-slider10": "slide10",
  "my-slider11": "slide11",
  "my-slider12": "slide12"

};


// ============ Render sản phẩm (thêm nút Add) ============
function renderProducts(containerId, products = []) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = products.map(p => {
    const pid = p.id || p.link || p.title;      // ưu tiên id
    const href = `/Home/ProductDetail?id=${encodeURIComponent(pid)}`;

    return `
      <div class="slidezy-item">
        <article class="product-card"
          data-id="${pid}"
          data-name="${p.title}"
          data-price="${p.price}"
          data-img="${p.image}">
          <div class="product-card__img-wrap">
            <a href="${href}">
              <img src="${p.image}" alt class="product-card__thumb">
            </a>
          </div>
          <h3 class="product-card__title"> 
            <a href="${href}">${p.title}</a>
          </h3>
          <div class="product-card__tag">
          ${(p.tags || []).map(tag => `<p>${tag}</p>`).join('')}
        </div>

        <p class="product-card__price">${p.price}</p>
        <div class="product-card__list-old">
          <p class="product-card__price-old">${p.oldPrice || ""}</p>
          <p class="percent">${p.discount || ""}</p>
        </div>

        <div class="product-card__row">
          <img src="${window.appConfig?.contentPath || '/Content'}/icons/star.svg" alt class="product-card__star">
          <span class="product-card__score">${p.score || ""}</span>
          <p class="vote-txt">• Đã bán ${p.sold || ""}</p>
        </div> 
          <button class="btn-add-cart" data-add-to-cart>Thêm vào giỏ</button>
        </article>
      </div>`;
  }).join('');
}


// ============ Helpers tiền tệ ============
const toNumberVND = (s) => parseInt(String(s || '').replace(/[^\d]/g, ''), 10) || 0;
const moneyVND = (n) => n.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });

// ============ Cart store ============
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
    if (next <= 0) {
      // về 0 thì xóa hẳn
      c.splice(i, 1);
    } else {
      c[i].qty = next;
    }
    this.set(c);
  },
  remove(id) { this.set(this.get().filter(x => x.id !== id)); },
  count() { return this.get().reduce((s, x) => s + x.qty, 0); },
  subtotal() { return this.get().reduce((s, x) => s + x.price * x.qty, 0); }
};


// ============ Load từ SQL API & init sliders ============
async function loadAllSlides() {
  try {
    // Gọi API từ SQL Server
    const res = await fetch('/Home/GetProducts', { cache: 'no-store' });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    
    // Kiểm tra content-type để đảm bảo là JSON
    const contentType = res.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await res.text();
      console.error('API trả về không phải JSON:', text.substring(0, 200));
      throw new Error('API trả về HTML thay vì JSON');
    }
    
    const data = await res.json();
    
    // Kiểm tra nếu có error trong response
    if (data.error) {
      console.error('API trả về lỗi:', data.error);
      throw new Error(data.error);
    }
    
    // Data từ API có format: { "slide1": [...], "slide2": [...], ... }
    Object.entries(sliderMap).forEach(([id, key]) => {
      renderProducts(id, data[key] || []);
    });
    
    if (typeof initMySlider === "function") {
      ["#my-slider1", "#my-slider2", "#my-slider3", "#my-slider4", "#my-slider5", "#my-slider6", "#my-slider7", "#my-slider8", "#my-slider9", "#my-slider10", "#my-slider11", "#my-slider12"]
        .forEach(sel => initMySlider(sel));
    }
  } catch (err) {
    console.error("Lỗi load products từ SQL:", err);
    // Fallback: thử load từ JSON nếu API fail
    try {
      const res = await fetch('./products.json');
      const data = await res.json();
      Object.entries(sliderMap).forEach(([id, key]) => {
        renderProducts(id, data[key] || []);
      });
      if (typeof initMySlider === "function") {
        ["#my-slider1", "#my-slider2", "#my-slider3", "#my-slider4", "#my-slider5", "#my-slider6", "#my-slider7", "#my-slider8", "#my-slider9", "#my-slider10", "#my-slider11", "#my-slider12"]
          .forEach(sel => initMySlider(sel));
      }
    } catch (fallbackErr) {
      console.error("Lỗi load JSON fallback:", fallbackErr);
    }
  }
}

// ============ Account dropdown (giữ nguyên) ============
document.addEventListener('DOMContentLoaded', () => {
  const acc = document.querySelector('.header-action__account');
  if (!acc) return;
  acc.addEventListener('click', (e) => {
    if (e.target.closest('a')) e.preventDefault();
    e.stopPropagation();
    acc.classList.toggle('is-open');
  });
  document.addEventListener('click', () => acc.classList.remove('is-open'));
});

// ============ Mini cart elements ============
const elList = document.getElementById('miniCartList');
const elCount = document.getElementById('miniCount');   // trong dropdown
const elCountTop = document.getElementById('cartCount');   // trên nút
const elSubtotal = document.getElementById('subtotal');
const elTax = document.getElementById('tax');
const elShip = document.getElementById('ship');
const elGrand = document.getElementById('grand');

const TAX_RATE = 0;
const SHIPPING_FLAT = 0;

function renderMiniCart() {
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
    elList.innerHTML = `<div class="col" style="width:100%"><p style="padding:8px 0;color:#666">Giỏ hàng trống</p></div>`;
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
        <button type="button" class="btn-qty" data-action="dec" data-id="${item.id}" aria-label="Giảm">-</button>
        <span>${item.qty}</span>
        <button type="button" class="btn-qty" data-action="inc" data-id="${item.id}" aria-label="Tăng">+</button>
      </div>

      <button type="button" class="mini-remove" data-action="remove" data-id="${item.id}"
              style="margin-top:6px;color:#c00;background:none;border:0;cursor:pointer">
        Xóa
      </button>
    </article>
  </div>
`).join('');


}

// ============ CHỈ 1 listener cho Add/Inc/Dec/Remove ============
document.addEventListener('click', (e) => {
  const addBtn = e.target.closest('.btn-add-cart');
  if (addBtn) {
    // Bỏ qua button trong ProductDetail (có class prod-info__add-to-cart)
    // Vì product-detail.js đã xử lý riêng
    if (addBtn.classList.contains('prod-info__add-to-cart')) {
      return;
    }
    const card = addBtn.closest('.product-card');
    const product = {
      id: (card.dataset.id || '').trim(),
      name: card.dataset.name,
      price: toNumberVND(card.dataset.price),
      img: card.dataset.img,
      qty: 1
    };
    if (!product.id) return;
    e.stopPropagation();
    
    // Check user đã đăng nhập
    const currentUser = window.Auth?.getCurrentUser?.() || null;
    
    if (!currentUser || !currentUser.id) {
      // Chưa đăng nhập: Bắt buộc đăng nhập
      swal({
        title: "Cần đăng nhập",
        text: 'Bạn cần đăng nhập để thêm sản phẩm vào giỏ hàng. Bạn có muốn chuyển đến trang đăng nhập không?',
        icon: "warning",
        buttons: {
          cancel: "Hủy",
          confirm: {
            text: "Đăng nhập",
            value: true
          }
        }
      }).then((willLogin) => {
        if (willLogin) {
          window.location.href = '/Account/Login';
        }
      });
      return;
    }
    
    // Đã đăng nhập: CHỈ lưu vào SQL, KHÔNG lưu vào localStorage
    (async () => {
      try {
        const token = document.querySelector('input[name="__RequestVerificationToken"]')?.value;
        if (!token) {
          console.warn('[app] Không có AntiForgeryToken');
          return;
        }
        
        const response = await fetch('/Cart/AddItem', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: `productId=${encodeURIComponent(product.id)}&productName=${encodeURIComponent(product.name || product.title || '')}&price=${product.price}&productImage=${encodeURIComponent(product.img || product.image || '')}&quantity=${product.qty || 1}&__RequestVerificationToken=${encodeURIComponent(token)}`
        });
        const result = await response.json();
        if (result.success) {
          console.log('[app] Đã lưu vào SQL (không lưu localStorage):', product.name);
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
          console.warn('[app] Lỗi lưu vào SQL:', result.message);
          // Hiển thị thông báo lỗi bằng SweetAlert
          swal({
            title: "Lỗi!",
            text: result.message || "Có lỗi xảy ra khi thêm vào giỏ hàng",
            icon: "error",
            button: "OK"
          });
        }
      } catch (e) {
        console.warn('[app] Lỗi sync server:', e);
      }
    })();
    return;
  }

  const decBtn = e.target.closest('.btn-qty.dec');
  const incBtn = e.target.closest('.btn-qty.inc');
  if (decBtn || incBtn) {
    e.stopPropagation();
    const id = (decBtn?.dataset.id || incBtn?.dataset.id || '').trim();
    if (!id) return;
    
    const currentUser = window.Auth?.getCurrentUser?.() || null;
    
    if (!currentUser || !currentUser.id) {
      // Chưa đăng nhập: CHỈ update localStorage
      cartStore.update(id, decBtn ? -1 : +1);
      renderMiniCart();
      return;
    }
    
    // Đã đăng nhập: CHỈ update SQL, KHÔNG update localStorage
    const token = document.querySelector('input[name="__RequestVerificationToken"]')?.value;
    if (token) {
      // Lấy quantity hiện tại từ SQL cart (tạm thời dùng localStorage để biết, sau đó reload từ SQL)
      const localItem = cartStore.get().find(x => x.id === id);
      const newQty = localItem ? (localItem.qty + (decBtn ? -1 : +1)) : (decBtn ? 0 : 1);
      
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
                console.log('[app] Đã xóa khỏi SQL:', id);
                // Reload cart từ SQL và render ngay
                await syncCartFromServer();
                if (window.renderMiniCart) {
                  window.renderMiniCart();
                }
              } else {
                console.warn('[app] Lỗi xóa khỏi SQL:', result.message);
              }
            }
          } catch (e) {
            console.warn('[app] Lỗi xóa khỏi SQL:', e);
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
                console.log('[app] Đã cập nhật SQL:', id, 'qty:', newQty);
                // Reload cart từ SQL và render ngay
                await syncCartFromServer();
                if (window.renderMiniCart) {
                  window.renderMiniCart();
                }
              } else {
                console.warn('[app] Lỗi cập nhật SQL:', result.message);
              }
            }
          } catch (e) {
            console.warn('[app] Lỗi update SQL:', e);
          }
        })();
      }
    }
    return;
  }

  // Nút xóa
  const rmBtn = e.target.closest('.mini-remove');
  if (rmBtn) {
    e.stopPropagation();
    const id = (rmBtn.dataset.id || '').trim();
    if (!id) return;
    
    const currentUser = window.Auth?.getCurrentUser?.() || null;
    
    if (!currentUser || !currentUser.id) {
      // Chưa đăng nhập: CHỈ xóa khỏi localStorage
      cartStore.remove(id);
      renderMiniCart();
      return;
    }
    
    // Đã đăng nhập: CHỈ xóa khỏi SQL, KHÔNG xóa localStorage
    const token = document.querySelector('input[name="__RequestVerificationToken"]')?.value;
    if (token) {
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
              console.log('[app] Đã xóa khỏi SQL:', id);
              // Reload cart từ SQL và render ngay
              await syncCartFromServer();
              if (window.renderMiniCart) {
                window.renderMiniCart();
              }
            } else {
              console.warn('[app] Lỗi xóa khỏi SQL:', result.message);
            }
          }
        } catch (e) {
          console.warn('[app] Lỗi xóa khỏi SQL:', e);
        }
      })();
    }
    return;
  }
});


// ============ Toggle dropdown bằng class .is-open ============
const toggleBtn = document.getElementById('cartToggle');
const miniCart = document.getElementById('miniCart');

cartStore.update = function (id, delta) {
  const c = this.get();
  const i = c.findIndex(x => x.id === id);
  if (i === -1) return;
  const next = c[i].qty + delta;
  if (next <= 0) c.splice(i, 1);
  else c[i].qty = next;
  this.set(c);
};

miniCart?.addEventListener('click', (e) => {
  e.stopPropagation();

  const btn = e.target.closest('[data-action]');
  if (!btn) return;

  const action = btn.dataset.action;
  const id = (btn.dataset.id || '').trim();
  if (!id) return;

  if (action === 'dec') {
    cartStore.update(id, -1);
  } else if (action === 'inc') {
    cartStore.update(id, 1);
  } else if (action === 'remove') {
    cartStore.remove(id);
  }

  renderMiniCart();
});

miniCart?.addEventListener('pointerdown', (e) => {
  const btn = e.target.closest('[data-action]');
  if (btn) e.stopPropagation();
});



toggleBtn?.addEventListener('click', (e) => {
  e.stopPropagation();
  miniCart.classList.toggle('is-open');
});
miniCart?.addEventListener('click', (e) => e.stopPropagation());
document.addEventListener('click', () => miniCart?.classList.remove('is-open'));

// ============ Init ============
document.addEventListener('DOMContentLoaded', () => {
  loadAllSlides();
  renderMiniCart();
});

let countDownDate = new Date().getTime() + (6 * 60 * 60 * 1000);

let timer = setInterval(function () {
  let now = new Date().getTime();
  let distance = countDownDate - now;

  if (distance < 0) {
    clearInterval(timer);
    const countdownEl = document.getElementById("countdown");
    if (countdownEl) countdownEl.innerHTML = "Đã kết thúc";
    return;
  }

  let hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  let minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
  let seconds = Math.floor((distance % (1000 * 60)) / 1000);

  // Kiểm tra element tồn tại trước khi set innerHTML
  const hoursEl = document.getElementById("hours");
  const minutesEl = document.getElementById("minutes");
  const secondsEl = document.getElementById("seconds");
  
  if (hoursEl) hoursEl.innerHTML = String(hours).padStart(2, '0');
  if (minutesEl) minutesEl.innerHTML = String(minutes).padStart(2, '0');
  if (secondsEl) secondsEl.innerHTML = String(seconds).padStart(2, '0');
}, 1000);
document.querySelectorAll(
  '.table-reponsiveee td, .table-reponsiveee tr, .table-reponsiveee th, .table-reponsiveee tbody'
).forEach(el => {
  el.removeAttribute('style');
  el.removeAttribute('class');
});

document.querySelectorAll('.table-reponsiveee table').forEach(table => {
  table.classList.add('table', 'table-striped', 'table-bordered');
  const parent = table.parentElement;
  const alreadyWrapped = parent && parent.classList.contains('table-responsive');
  if (!alreadyWrapped) {
    const wrapper = document.createElement('div');
    wrapper.classList.add('table-responsive');
    parent.insertBefore(wrapper, table);
    wrapper.appendChild(table);
  }
});

