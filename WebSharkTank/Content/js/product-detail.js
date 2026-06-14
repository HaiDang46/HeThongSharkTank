// assets/js/product-detail.js
(function () {
    // ===== Helpers chung =====
    const $ = (s, r = document) => r.querySelector(s);
    const toNumber = (v) =>
      typeof v === "number" ? v : parseInt(String(v || "").replace(/[^\d]/g, ""), 10) || 0;
    const moneyVND = (n) =>
      (n || 0).toLocaleString("vi-VN", { style: "currency", currency: "VND" });
    const TAX_RATE = 0.10;
  
    const parsePercent = (v) => {
      if (v == null) return 0;
      if (typeof v === "number") return v > 1 ? v / 100 : v;
      const m = String(v).trim().match(/-?\d+(\.\d+)?/);
      if (!m) return 0;
      return parseFloat(m[0]) / 100;
    };
  
    const slugify = (str = "") =>
      String(str)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
  
    // ===== Specs (Thông số) =====
    // ===== Specs (Thông số) =====
    async function renderSpecsForProduct(prod, pid) {
      const list = document.getElementById("specList");
      if (!list) return;

      // escape HTML cơ bản
      const esc = (s) => String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

      const isPrimitive = (x) =>
        x == null || ["string", "number", "boolean"].includes(typeof x);

      function renderLeaf(val) {
        if (val == null) return "";
        if (Array.isArray(val)) {
          // nếu là mảng primitive -> join; nếu là mảng object -> render dạng danh sách con
          if (val.every(isPrimitive)) return esc(val.join(", "));
          return `<ul class="spec-sublist">
          ${val.map((item, i) => `
            <li class="spec-subitem">
              <span class="spec-k">#${i + 1}</span>
              ${typeof item === "object"
              ? `<ul class="spec-sublist">${renderPairs(item)}</ul>`
              : `<span class="spec-v">${esc(item)}</span>`}
            </li>`).join("")}
        </ul>`;
        }
        if (typeof val === "object") {
          // object lồng
          return `<ul class="spec-sublist">${renderPairs(val)}</ul>`;
        }
        return esc(val);
      }

      function renderPairs(obj) {
        if (!obj || typeof obj !== "object") return "";
        return Object.entries(obj).map(([k, v]) => `
        <li class="spec-item">
          <span class="spec-k">${esc(k)}:</span>
          <span class="spec-v">${renderLeaf(v)}</span>
        </li>
      `).join("");
      }

      let spec = null;

      // Ưu tiên lấy từ prod.specs (nếu đã có trong GetProductDetail)
      if (prod && prod.specs && Object.keys(prod.specs).length > 0) {
        spec = prod.specs;
        console.log("[specs] Loaded from product data:", spec);
      } else {
        // Fallback: load từ API
        try {
          const res = await fetch(`/Home/GetProductSpecs?id=${encodeURIComponent(pid)}`, { cache: "no-store" });
          if (res.ok) {
            const data = await res.json();
            if (data && data.specs && Object.keys(data.specs).length > 0) {
              spec = data.specs;
              console.log("[specs] Loaded from API:", spec);
            }
          }
        } catch (e) {
          console.warn("[specs] Không load được từ API, thử JSON:", e);
        }

        // Fallback cuối: load từ JSON file
        if (!spec) {
          try {
            const res = await fetch("./json/specs.json", { cache: "no-store" });
            const map = await res.json();

            const candidates = [
              prod?.id,
              pid,
              slugify(pid || ""),
              slugify(prod?.title || ""),
            ].filter(Boolean);
            const key = candidates.find((k) => Object.prototype.hasOwnProperty.call(map, k));
            spec = key ? map[key] : null;
            if (spec) {
              console.log("[specs] Loaded from JSON file:", spec);
            }
          } catch (e) {
            console.error("[specs] lỗi tải specs.json:", e);
          }
        }
      }

      list.innerHTML = spec
        ? renderPairs(spec)
        : '<li class="spec-item">Chưa có thông số cho sản phẩm này.</li>';
    }
  
  
    async function renderDescription(pid, prod = null) {
      const el = document.getElementById("descContent");
      if (!el) return;

      el.classList.add("is-loading");

      let descriptionArray = [];

      // Ưu tiên lấy từ prod.description (nếu đã có trong GetProductDetail)
      if (prod && prod.description && Array.isArray(prod.description) && prod.description.length > 0) {
        descriptionArray = prod.description;
        console.log("[desc] Loaded from product data:", descriptionArray.length, "items");
      } else {
        // Fallback: load từ API
        try {
          const res = await fetch(`/Home/GetProductDescription?id=${encodeURIComponent(pid)}`, { cache: "no-store" });
          if (res.ok) {
            const data = await res.json();
            if (data && data.description && Array.isArray(data.description) && data.description.length > 0) {
              descriptionArray = data.description;
              console.log("[desc] Loaded from API:", descriptionArray.length, "items");
            }
          }
        } catch (err) {
          console.warn("[desc] Không load được từ API, thử JSON:", err);
        }

        // Fallback cuối: load từ JSON file
        if (descriptionArray.length === 0) {
          try {
            const res = await fetch("./json/descriptions.json", { cache: "no-store" });
            if (!res.ok) throw new Error("HTTP " + res.status);

            const map = await res.json();
            const keys = [pid, slugify(pid || "")].filter(Boolean);
            descriptionArray =
              map[keys[0]] ||
              map[keys[1]] ||
              [];
            
            if (descriptionArray.length > 0) {
              console.log("[desc] Loaded from JSON file:", descriptionArray.length, "items");
            }
          } catch (err) {
            console.error("[desc] lỗi tải descriptions.json:", err);
          }
        }
      }

      el.innerHTML = descriptionArray.length 
        ? descriptionArray.join("") 
        : "<p>Chưa có mô tả cho sản phẩm này.</p>";
      
      el.classList.remove("is-loading");
    }
  
    // ===== Toggle “Xem thêm ưu đãi” =====
    function bindOfferToggleOnce() {
      document.addEventListener("click", (e) => {
        const btn = e.target.closest(".offer-block__toggle");
        if (!btn) return;
  
        const moreItems = document.querySelectorAll(".offer-block__item--more");
        const expanded = btn.getAttribute("data-expanded") === "true";
  
        moreItems.forEach((li) => li.classList.toggle("pd-hide", expanded)); // true => ẩn lại
        btn.setAttribute("data-expanded", (!expanded).toString());
        btn.textContent = expanded ? "Xem thêm ưu đãi khác" : "Thu gọn ưu đãi";
      });
    }
    // ===== Helpers chung =====
  
    (function () {
      // Helpers
      const toNumber = (v) => parseInt(String(v || "").replace(/[^\d]/g, ""), 10) || 0;
      const moneyVND = (n) => (n || 0).toLocaleString("vi-VN", { style: "currency", currency: "VND" });
  
      // Lấy giá đang HIỂN THỊ (ưu tiên các ô giá trên trang)
      function getCurrentProductPrice() {
        const elMain1 = document.querySelector(".prod-info__total-price"); // giá chính (trước thuế/đã giảm)
        const elMain2 = document.getElementById("total-price");            // fallback id cũ
        const elAlt1 = document.querySelector(".prod-info__price");       // giá phụ (sau thuế)
        const elAlt2 = document.getElementById("price");                  // fallback id cũ
        const holder = document.getElementById("productHolder");          // dataset nếu có
  
        const raw =
          (elMain1 && elMain1.textContent) ||
          (elMain2 && elMain2.textContent) ||
          (elAlt1 && elAlt1.textContent) ||
          (elAlt2 && elAlt2.textContent) ||
          (holder && holder.dataset && holder.dataset.price) || "";
  
        return toNumber(raw);
      }
  
      // Tính & gắn "Chỉ từ …/tháng" cho 2 nút trả góp
      function updateInstallmentButtons() {
        const price = getCurrentProductPrice();
        if (!price) return;
  
        document.querySelectorAll(".btn.btn--primary-blue.prod-info__buy").forEach((btn) => {
          // Cho phép set số tháng riêng: data-months="6", mặc định 12
          const months = parseInt(btn.getAttribute("data-months"), 10) || 12;
          const perMonth = Math.ceil(price / months);
  
          let sub = btn.querySelector(".button-title");
          if (!sub) {
            sub = document.createElement("span");
            sub.className = "button-title";
            btn.appendChild(sub);
          }
          sub.textContent = `Chỉ từ ${moneyVND(perMonth)}/tháng`;
        });
      }
  
      document.addEventListener("DOMContentLoaded", updateInstallmentButtons);
  
      const priceTargets = [
        ".prod-info__total-price",
        "#total-price",
        ".prod-info__price",
        "#price",
      ];
      const targetEl = priceTargets.map((s) => document.querySelector(s)).find(Boolean);
      if (targetEl) {
        const mo = new MutationObserver(updateInstallmentButtons);
        mo.observe(targetEl, { childList: true, characterData: true, subtree: true });
      }
  
      window.updateInstallmentButtons = updateInstallmentButtons;
    })();
  
    // ===== Main =====
    document.addEventListener("DOMContentLoaded", async () => {
      const params = new URLSearchParams(location.search);
      let pid = params.get("id") || localStorage.getItem("lastProductId");
      if (!pid) {
        console.warn("[product-detail] thiếu id trên URL");
        return;
      }
      pid = decodeURIComponent(pid);
      localStorage.setItem("lastProductId", pid);
  
      // DOM hooks
      const listBig = $(".prod-preview__list");
      const listThumb = $(".prod-preview__thumbs");
      const titleEl = $(".prod-info__heading");
      const totalEl = $(".prod-info__price");
      const taxEl = $(".prod-info__tax");
      const priceEl = $(".prod-info__total-price");
      const addBtn = $(".prod-info__add-to-cart");
  
      // Hiển thị loading indicator
      if (titleEl) titleEl.textContent = "Đang tải...";
      
      let prod;
      try {
        // Load từ SQL API - API này đã trả về cả description và specs
        const res = await fetch(`/Home/GetProductDetail?id=${encodeURIComponent(pid)}`, { 
          cache: "no-store",
          headers: { 'Cache-Control': 'no-cache' }
        });
        if (res.ok) {
          const data = await res.json();
          if (data && !data.error) {
            prod = { ...data, _id: data.id };
            console.log("[product-detail] Loaded from API:", prod);
          } else {
            console.warn("[product-detail] API returned error:", data);
          }
        } else {
          console.warn("[product-detail] API response not OK:", res.status);
        }
      } catch (e) {
        console.warn("[product-detail] Không load được từ API:", e);
      }

      // KHÔNG fallback sang GetProducts vì load tất cả sản phẩm rất chậm
      // Nếu không có sản phẩm, hiển thị thông báo
  
      if (!prod) {
        if (titleEl) titleEl.textContent = "Product not found";
        console.warn("[product-detail] Không tìm thấy sản phẩm với id:", pid);
        return;
      }

      // Debug: log để kiểm tra
      console.log("[product-detail] Product data:", {
        title: prod.title,
        price: prod.price,
        oldPrice: prod.oldPrice,
        discount: prod.discount
      });
  
      // Gallery
      const gallery = (prod.images?.length ? prod.images : [prod.image, prod.image, prod.image, prod.image]).filter(Boolean);
  
      if (listBig) {
        listBig.innerHTML = gallery
          .map(
            (src) => `
          <div class="prod-preview__item">
            <img src="${src}" alt="" class="prod-preview__img" />
          </div>`
          )
          .join("");
      }
  
      if (listThumb) {
        listThumb.innerHTML = gallery
          .map(
            (src, i) => `
          <img src="${src}" alt="" class="prod-preview__thumb-img ${i === 0 ? "prod-preview__thumb-img--current" : ""}" data-idx="${i}" />`
          )
          .join("");
  
        listThumb.addEventListener("click", (e) => {
          const img = e.target.closest(".prod-preview__thumb-img");
          if (!img) return;
          const idx = +img.dataset.idx;
  
          [...listThumb.querySelectorAll(".prod-preview__thumb-img")].forEach((t) =>
            t.classList.remove("prod-preview__thumb-img--current")
          );
          img.classList.add("prod-preview__thumb-img--current");
  
          const bigItems = listBig?.querySelectorAll(".prod-preview__item");
          bigItems?.[idx]?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
        });
      }
  
      // ===== Giá, giảm giá & thuế =====
      const rawPrice = toNumber(prod.price);
      const rawOldPrice = toNumber(prod.oldPrice);
      const hasValidOld = rawOldPrice && rawOldPrice > rawPrice;
  
  
      const taxRate = (typeof prod.tax === "number") ? prod.tax : TAX_RATE;
  
      let priceAfterDiscount;
      let percentDisplay = "";
  
      if (hasValidOld) {
        priceAfterDiscount = rawPrice;
  
        const p = parsePercent(prod.discount);
        if (p) {
          percentDisplay = `${Math.round(p * 100)}%`;
        } else {
          const rate = (rawPrice && rawOldPrice) ? (rawPrice / rawOldPrice - 1) : 0;
          percentDisplay = rate ? `${Math.round(rate * 100)}%` : "";
        }
      } else {
        let discountRate = parsePercent(prod.discount);
        if (discountRate > 0) discountRate = -Math.abs(discountRate);
  
        if (discountRate) {
          priceAfterDiscount = Math.max(0, Math.round(rawPrice * (1 + discountRate)));
          percentDisplay = `${Math.round(discountRate * 100)}%`;
        } else {
          priceAfterDiscount = rawPrice;
          percentDisplay = "";
        }
      }
  
  
      const totalAfterTax = Math.round(priceAfterDiscount * (1 + taxRate));
  
  
      // Gán UI
      if (titleEl) {
        titleEl.textContent = prod.title || prod.Title || "Sản phẩm";
        console.log("[product-detail] Set title to:", titleEl.textContent);
      } else {
        console.warn("[product-detail] titleEl not found!");
      }
      
      if (priceEl) {
        priceEl.textContent = moneyVND(priceAfterDiscount);
        console.log("[product-detail] Set price to:", moneyVND(priceAfterDiscount));
      } else {
        console.warn("[product-detail] priceEl not found!");
      }
      
      if (taxEl) {
        taxEl.textContent = `${Math.round(taxRate * 100)}%`;
      }
      
      if (totalEl) {
        totalEl.textContent = hasValidOld ? moneyVND(rawOldPrice) : "";
      }
  
      let discountEl = $(".prod-info__tax");
      if (!discountEl && taxEl) {
        discountEl = document.createElement("span");
        discountEl.className = "prod-info__tax";
        taxEl.parentNode.insertBefore(discountEl, taxEl);
      }
      if (discountEl) {
        if (percentDisplay) {
          discountEl.textContent = percentDisplay;
          discountEl.classList.remove("pd-hide");
        } else {
          discountEl.textContent = "";
          discountEl.classList.add("pd-hide");
        }
      }
  
  
      // Add to cart
      addBtn?.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
  
        const qtyInput = document.getElementById("detailQty");
        let qty = parseInt(qtyInput?.value, 10);
        if (!Number.isFinite(qty) || qty < 1) qty = 1;
  
        const item = {
          id: prod._id,
          name: prod.title,
          price: priceAfterDiscount,
          img: prod.image || gallery[0],
          qty,
        };
        
        // Check user đã đăng nhập - KIỂM TRA TỪ SERVER (Session)
        (async () => {
          // Kiểm tra đăng nhập từ server trước
          let isLoggedIn = false;
          try {
            const authCheck = await fetch('/Account/GetCurrentUser', {
              cache: 'no-cache',
              headers: { 'Cache-Control': 'no-cache' }
            });
            if (authCheck.ok) {
              const authData = await authCheck.json();
              isLoggedIn = authData.success && authData.authenticated && authData.user && authData.user.id;
            }
          } catch (e) {
            console.warn('[product-detail] Lỗi kiểm tra đăng nhập:', e);
          }
          
          if (!isLoggedIn) {
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
          try {
            const token = document.querySelector('input[name="__RequestVerificationToken"]')?.value;
            if (!token) {
              console.warn('[product-detail] Không có AntiForgeryToken');
              return;
            }
            
            const response = await fetch('/Cart/AddItem', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: `productId=${encodeURIComponent(item.id)}&productName=${encodeURIComponent(item.name)}&price=${item.price}&productImage=${encodeURIComponent(item.img)}&quantity=${item.qty}&__RequestVerificationToken=${encodeURIComponent(token)}`
            });
            const result = await response.json();
            if (result.success) {
              console.log('[product-detail] Đã lưu vào SQL (không lưu localStorage):', item.name);
              // Hiển thị SweetAlert thông báo thành công
              swal({
                title: "Thành công!",
                text: "Đã thêm sản phẩm vào giỏ hàng",
                icon: "success",
                button: "OK"
              });
              // Reload cart từ server
              setTimeout(() => {
                if (window.Auth?.getCurrentUser?.() && window.syncCartFromServer) {
                  window.syncCartFromServer();
                }
              }, 100);
            } else {
              console.warn('[product-detail] Lỗi lưu vào SQL:', result.message);
              // Hiển thị thông báo lỗi bằng SweetAlert
              swal({
                title: "Lỗi!",
                text: result.message || "Có lỗi xảy ra khi thêm vào giỏ hàng",
                icon: "error",
                button: "OK"
              });
            }
          } catch (e) {
            console.warn('[product-detail] Lỗi sync server:', e);
          }
        })();
      });
  
      // Load specs và description song song (parallel) thay vì tuần tự để tăng tốc
      // Nếu GetProductDetail đã trả về specs và description, không cần gọi API lại
      const [specsResult, descResult] = await Promise.allSettled([
        renderSpecsForProduct(prod, pid),
        renderDescription(prod.id || pid, prod)
      ]);
      
      // Log nếu có lỗi (nhưng không block UI)
      if (specsResult.status === 'rejected') {
        console.debug('[product-detail] Specs load error:', specsResult.reason);
      }
      if (descResult.status === 'rejected') {
        console.debug('[product-detail] Description load error:', descResult.reason);
      }
  
      bindOfferToggleOnce();
    });
  })();
  
  // Nút + / −
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("#detailQtyWrap .qty-btn");
    if (!btn) return;
  
    const delta = parseInt(btn.dataset.delta, 10) || 0;
    const input = document.getElementById("detailQty");
    if (!input) return;
  
    let current = parseInt(input.value, 10) || 1;
    current = Math.max(1, current + delta);
    input.value = String(current);
  });
  
  const qtyInput = document.getElementById("detailQty");
  qtyInput?.addEventListener("input", () => {
    const cleaned = (qtyInput.value.match(/\d+/g) || ["1"]).join("");
    qtyInput.value = String(Math.max(1, parseInt(cleaned, 10) || 1));
  });
  updateInstallmentButtons();
  (function () {
    const $ = (s, r = document) => r.querySelector(s);
    const slugify = (str = "") =>
      String(str).normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase()
        .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  
    function bumpViews(key) {
      const LS_KEY = "productViews";
      let map = {};
      try { map = JSON.parse(localStorage.getItem(LS_KEY)) || {}; } catch { }
      map[key] = (map[key] || 0) + 1;
      localStorage.setItem(LS_KEY, JSON.stringify(map));
      return map[key];
    }
  
    function renderMeta({ prod, pid }) {
      const rateEl = $("#metaRating");
      const cmtEl = $("#metaComments");
      const viewsEl = $("#metaViews");
      const soldEl = $("#metaSold");
  
      let score = 0;
      if (prod.score) {
        const s = String(prod.score).replace(",", ".").match(/[\d.]+/);
        score = s ? parseFloat(s[0]) : 0;
      }
      if (rateEl) rateEl.textContent = score.toFixed(1).replace(".0", "");
  
      if (cmtEl) cmtEl.textContent = prod.commentsCount ? String(prod.commentsCount) : "0";
  
      const viewKey = "pv_" + (prod.id || pid || slugify(prod.title || ""));
      const views = bumpViews(viewKey);
      if (viewsEl) viewsEl.textContent = views.toLocaleString("vi-VN");
  
      if (soldEl) soldEl.textContent = prod.sold ? String(prod.sold) : "0";
    }
  
    document.addEventListener("DOMContentLoaded", () => {
      const params = new URLSearchParams(location.search);
      let pid = params.get("id") || localStorage.getItem("lastProductId");
      if (!pid) return;
      pid = decodeURIComponent(pid);
  
      if (window.__currentProduct) {
        renderMeta({ prod: window.__currentProduct, pid });
        return;
      }

      // Load từ API thay vì file JSON
      fetch('/Home/GetProducts')
        .then(r => {
          if (!r.ok) throw new Error('API not OK');
          return r.json();
        })
        .then(data => {
          // Unwrap: API trả về object có nhiều mảng con hoặc array
          let all = [];
          if (Array.isArray(data)) {
            all = data;
          } else if (data && typeof data === "object") {
            all = Object.values(data).flat();
          }
          const withId = all.map((p) => ({ ...p, _id: p.id || p.link || p.title }));
          const prod = withId.find(p => p._id === pid) ||
            withId.find(p => slugify(p.title) === slugify(pid));
          if (prod) renderMeta({ prod, pid });
        })
        .catch(() => { 
          // Silently fail - không có meta data cũng không sao
        });
    });
  })();
  // ===== Similar items (hardened) =====
  (function () {
    const $ = (s, r = document) => r.querySelector(s);
  
    function moneyVND(n) {
      const num = typeof n === "number" ? n : parseFloat(String(n).replace(/[^\d.]/g, "")) || 0;
      try { return num.toLocaleString("vi-VN", { style: "currency", currency: "VND" }); }
      catch { return num.toFixed(0); }
    }
  
    // --- LOAD & CHUẨN HÓA products từ API ---
    async function loadProducts() {
      // Thử load từ API trước
      try {
        const res = await fetch('/Home/GetProducts', { cache: "no-store" });
        if (res.ok) {
          let data = await res.json();
          
          // Unwrap: API trả về object có nhiều mảng con (slide1..) hoặc array
          if (Array.isArray(data)) {
            // đã là array
          } else if (data && typeof data === "object") {
            data = Object.values(data).reduce((acc, v) => {
              if (Array.isArray(v)) acc.push(...v);
              return acc;
            }, []);
          } else {
            data = [];
          }

          console.log("[similar] Loaded from API:", Array.isArray(data) ? data.length : 0, "products");
          return data || [];
        } else {
          console.debug("[similar] API response not OK:", res.status);
        }
      } catch (e) {
        console.debug("[similar] Can't load from API:", e.message || e);
      }

      // Fallback: thử các đường dẫn JSON cũ (nếu còn dùng) - nhưng không throw error
      const here = location.pathname.replace(/[^/]+$/, "");
      const origin = location.origin;
      const candidates = [
        `${here}products.json`,
        `${origin}/products.json`,
        `./products.json`
      ];

      for (const url of candidates) {
        try {
          const res = await fetch(url, { cache: "no-store" });
          if (!res.ok) {
            console.debug(`[similar] ${url} returned ${res.status}`);
            continue; // Tiếp tục thử URL tiếp theo thay vì throw
          }
          let data = await res.json();

          if (Array.isArray(data)) {
            // đã là array
          } else if (data && typeof data === "object") {
            data = Object.values(data).reduce((acc, v) => {
              if (Array.isArray(v)) acc.push(...v);
              return acc;
            }, []);
          } else {
            data = [];
          }

          console.log("[similar] Loaded from JSON:", url, Array.isArray(data) ? data.length : 0);
          return data || [];
        } catch (e) {
          console.debug("[similar] Can't load", url, e.message || e);
          // Tiếp tục thử URL tiếp theo
        }
      }
      
      // Trả về mảng rỗng thay vì throw error - KHÔNG BAO GIỜ throw
      console.warn("[similar] Không tải được products từ bất kỳ nguồn nào, trả về mảng rỗng");
      return [];
    }
  
    function getCurrentProduct(products) {
      const params = new URLSearchParams(location.search);
      const id = params.get("id");
      const titleText = $("#prod-title")?.textContent?.trim()?.toLowerCase() || "";
      const brandText = $(".prod-info__brand, .product-card__brand")?.textContent?.trim()?.toLowerCase() || "";
  
      let cur =
        (id && products.find(p => String(p.id) === String(id))) ||
        products.find(p => (p.title || p.name || "").toLowerCase() === titleText) ||
        null;
  
      if (!cur && brandText) {
        cur = products.find(p => (p.brand || "").toLowerCase() === brandText) || null;
      }
      return cur;
    }
  
    function similarityMaker(current) {
      const curBrand = (current.brand || "").toLowerCase();
      const curCategory = (current.category || current.type || "").toLowerCase();
      const curTags = (current.tags || []).map(t => (t || "").toLowerCase());
      const priceCur = Number(current.price ?? current.finalPrice ?? 0);
  
      return function score(p) {
        let s = 0;
        if ((p.brand || "").toLowerCase() === curBrand) s += 3;
        if ((p.category || p.type || "").toLowerCase() === curCategory) s += 2;
        const tags = (p.tags || []).map(t => (t || "").toLowerCase());
        if (tags.some(t => curTags.includes(t))) s += 1;
        const priceP = Number(p.price ?? p.finalPrice ?? 0);
        if (priceCur && priceP) {
          const diff = Math.abs(priceCur - priceP) / Math.max(priceCur, priceP);
          if (diff < 0.15) s += 1;
        }
        return s;
      };
    }
  
    function cardHTML(p) {
      const pid = p.id || p._id || p.link || p.title;
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
    }
  
    // like handler — robust với SVG/Text node
    function initLike(grid) {
      const KEY = "favourites";
      const getFav = () => { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; } };
      const setFav = (arr) => localStorage.setItem(KEY, JSON.stringify(arr));
  
      const fav = new Set(getFav().map(String));
      grid.querySelectorAll("[data-like-id]").forEach(btn => {
        const id = btn.getAttribute("data-like-id");
        if (fav.has(String(id))) btn.classList.add("like-btn--liked");
      });
  
      grid.addEventListener("click", (e) => {
        const path = e.composedPath ? e.composedPath() : [];
        const btn = path.find(n => n instanceof Element && n.matches?.("[data-like-id]"));
        if (!btn) return;
        const pid = String(btn.getAttribute("data-like-id"));
        if (fav.has(pid)) { fav.delete(pid); btn.classList.remove("like-btn--liked"); }
        else { fav.add(pid); btn.classList.add("like-btn--liked"); }
        setFav([...fav]);
      });
    }
  
    async function run() {
      const grid = document.getElementById("similar-grid");
      if (!grid) { console.warn("[similar] #similar-grid không tồn tại"); return; }
  
      let products = [];
      try {
        products = await loadProducts();
      } catch (e) {
        console.error("[similar] Lỗi load products:", e);
        grid.innerHTML = `<div class="col"><p style="padding:12px;color:#888">Không tải được danh sách sản phẩm.</p></div>`;
        return;
      }
  
      const current = getCurrentProduct(products);
      if (!current) {
        console.warn("[similar] Không xác định được sản phẩm hiện tại");
        grid.innerHTML = `<div class="col"><p style="padding:12px;color:#888">Chưa xác định sản phẩm hiện tại để gợi ý.</p></div>`;
        return;
      }
  
      const score = similarityMaker(current);
      const list = products
        .filter(p => String(p.id) !== String(current.id))
        .map(p => ({ p, s: score(p) }))
        .filter(x => x.s > 0)
        .sort((a, b) => b.s - a.s)
        .slice(0, 5)
        .map(x => x.p);
  
      if (!list.length) {
        grid.innerHTML = `<div class="col"><p style="padding:12px;color:#888">Không tìm thấy sản phẩm tương tự.</p></div>`;
        return;
      }
  
      grid.innerHTML = list.map(cardHTML).join("");
      initLike(grid);
    }
  
    const kick = () => { try { run(); } catch (e) { console.error(e); } };
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", kick, { once: true });
    } else {
      kick();
    }
    window.addEventListener("template-loaded", kick, { once: true });
  })();
  
  