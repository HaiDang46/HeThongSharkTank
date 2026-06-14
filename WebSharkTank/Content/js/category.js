// assets/js/category.js
(() => {
    // ========= Helpers =========
    const $ = (s, r = document) => r.querySelector(s);
    const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
    const toNumber = (v) => parseInt(String(v || '').replace(/[^\d]/g, ''), 10) || 0;
    const moneyVND = (n) => (n || 0).toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });
    const isHiddenTag = (t) => String(t || "").trim().startsWith(".");

    const PAGE_SIZE = 24;
    const BRANDS = [
        "Apple", "Acer", "Asus", "Lenovo", "MSI", "Dell", "HP", "Razer", "Logitech", "SteelSeries", "Akko", "Keychron", "Gigabyte", "Huawei", "Samsung", "Xiaomi", "LG", "Sony"
    ];
    const TYPE_RULES = [
        { type: "Mac", rx: /(macbook|imac|mac\s?mini)/i },
        { type: "Laptop", rx: /(laptop|notebook|ideapad|thinkpad|zenbook|vivobook)/i },
        { type: "Bàn phím", rx: /(keyboard|bàn\s?phím)/i },
        { type: "Chuột", rx: /(Chuột|mouse)/i },
        { type: "VGA", rx: /(VGA)/i },
        { type: "Ram", rx: /(DDR)/i },
        { type: "Màn hình", rx: /(Màn\s?hình)/i },
        { type: "PC", rx: /\b(pc|desktop|build)\b/i },
        { type: "Thiết bị Mạng", rx: /\b(Router)\b/i },
        { type: "Khác", rx: /./ } // fallback 
    ];

    // ========= State =========
    let PRODUCTS = [];   // normalized list
    let FACETS = { brands: [], types: [], tags: [] };
    let STATE = { q: "", brands: [], types: [], tags: [], min: null, max: null, sort: "", page: 1 };

    // ========= Init =========
    document.addEventListener("DOMContentLoaded", async () => {
        await loadData();
        buildFacets();
        hydrateFromURL();
        wireUI();
        initPriceSlider();
        render();
    });

    async function loadData() {
        // Load từ API thay vì JSON file
        let all = [];
        try {
            const response = await fetch('/Home/GetProducts');
            if (response.ok) {
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    const data = await response.json();
                    // API trả về object với key là category, value là array products
                    all = Object.values(data).flat();
                } else {
                    console.warn('[category] API returned non-JSON, falling back to empty array');
                }
            } else {
                console.warn('[category] API request failed:', response.status);
            }
        } catch (e) {
            console.error('[category] Error loading products:', e);
        }

        PRODUCTS = all.map(p => {
            const rawPrice = toNumber(p.price);
            const rawOldPrice = toNumber(p.oldPrice);
            const hasValidOld = rawOldPrice && rawOldPrice > rawPrice;

            // price dùng cho hiển thị + add to cart: sau giảm (trước thuế)
            const displayPrice = hasValidOld ? rawPrice : rawPrice;

            const brand = guessBrand(p.title);
            const type = guessType(p.title);
            const score = parseFloat(String(p.score || "0").replace(",", ".").match(/[\d.]+/)?.[0] || "0");
            const sold = toNumber(String(p.sold || "0")); // "11,7k" -> chỉ lấy số gốc; nếu muốn chính xác hơn có thể quy đổi "k" thành *1000

            return {
                ...p,
                _id: p.id || p.link || p.title,
                _price: displayPrice,
                _old: rawOldPrice || 0,
                _hasOld: !!hasValidOld,
                _brand: brand,
                _type: type,
                _tags: (p.tags || []).slice(),
                _score: isFinite(score) ? score : 0,
                _sold: sold
            };
        });
    }

    function guessBrand(title = "") {
        for (const b of BRANDS) if (new RegExp(`\\b${b}\\b`, "i").test(title)) return b;
        // 1 số case ở đầu tên: "Laptop MSI Modern..." → bắt từ đầu
        const head = title.split(/\s+/)[0];
        if (BRANDS.includes(head)) return head;
        return "Khác";
    }

    function guessType(title = "") {
        for (const rule of TYPE_RULES) if (rule.rx.test(title)) return rule.type;
        return "Khác";
    }

    function buildFacets() {
        const bset = new Set(), tset = new Set(), tagset = new Set();
        PRODUCTS.forEach(p => {
            bset.add(p._brand);
            tset.add(p._type);
            (p._tags || []).forEach(t => { if (!isHiddenTag(t)) tagset.add(t); }); // chỉ add tag hiển thị
        });
        FACETS.brands = Array.from(bset).sort();
        FACETS.types = Array.from(tset).sort();
        FACETS.tags = Array.from(tagset).sort();

        renderFacetList("#flt-brands", FACETS.brands, "brand");
        renderFacetList("#flt-types", FACETS.types, "type");
        renderFacetList("#flt-tags", FACETS.tags, "tag");
    }


    function renderFacetList(sel, arr, kind) {
        const host = $(sel);
        if (!host) return;
        host.innerHTML = arr.map(v => `
      <li class="spec-item">
        <label style="display:flex;gap:8px;align-items:center;cursor:pointer">
          <input type="checkbox" data-facet="${kind}" value="${escapeHtml(v)}"/>
          <span>${escapeHtml(v)}</span>
        </label>
      </li>`).join("");
    }

    function escapeHtml(s = "") { return String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])) }

    // ========= URL <-> STATE =========
    function hydrateFromURL() {
        const q = new URLSearchParams(location.search);
        STATE.q = q.get("q") || "";
        STATE.brands = (q.getAll("brand") || []).filter(Boolean);
        STATE.types = (q.getAll("type") || []).filter(Boolean);
        STATE.tags = (q.getAll("tag") || []).filter(Boolean);
        STATE.min = q.get("min") ? toNumber(q.get("min")) : null;
        STATE.max = q.get("max") ? toNumber(q.get("max")) : null;
        STATE.sort = q.get("sort") || "";
        STATE.page = Math.max(1, parseInt(q.get("page") || "1", 10) || 1);

        // sync UI
        $("#flt-q").value = STATE.q;
        $$("#flt-brands input[type=checkbox]").forEach(cb => cb.checked = STATE.brands.includes(cb.value));
        $$("#flt-types  input[type=checkbox]").forEach(cb => cb.checked = STATE.types.includes(cb.value));
        $$("#flt-tags   input[type=checkbox]").forEach(cb => cb.checked = STATE.tags.includes(cb.value));
        $("#flt-min").value = STATE.min ? STATE.min.toLocaleString("vi-VN") : "";
        $("#flt-max").value = STATE.max ? STATE.max.toLocaleString("vi-VN") : "";
        $("#sortSel").value = STATE.sort;
    }

    function pushURL() {
        const q = new URLSearchParams();
        if (STATE.q) q.set("q", STATE.q);
        STATE.brands.forEach(b => q.append("brand", b));
        STATE.types.forEach(t => q.append("type", t));
        STATE.tags.forEach(tg => q.append("tag", tg));
        if (STATE.min != null) q.set("min", STATE.min);
        if (STATE.max != null) q.set("max", STATE.max);
        if (STATE.sort) q.set("sort", STATE.sort);
        if (STATE.page > 1) q.set("page", String(STATE.page));

        const url = location.pathname + (q.toString() ? `?${q.toString()}` : "");
        history.replaceState(null, "", url);
    }

    // ========= Filter + Sort =========
    function applyFilters() {
        const kw = STATE.q.trim().toLowerCase();
        const inKw = (p) => {
            if (!kw) return true;
            return (p.title || "").toLowerCase().includes(kw)
                || (p._tags || []).some(t => String(t).toLowerCase().includes(kw));
        };

        const inBrands = (p) => !STATE.brands.length || STATE.brands.includes(p._brand);
        const inTypes = (p) => !STATE.types.length || STATE.types.includes(p._type);
        const inTags = (p) => !STATE.tags.length || STATE.tags.every(t => p._tags.includes(t));
        const inPrice = (p) => {
            if (STATE.min != null && p._price < STATE.min) return false;
            if (STATE.max != null && p._price > STATE.max) return false;
            return true;
        };

        let list = PRODUCTS.filter(p => inKw(p) && inBrands(p) && inTypes(p) && inTags(p) && inPrice(p));

        switch (STATE.sort) {
            case "price-asc": list.sort((a, b) => a._price - b._price); break;
            case "price-desc": list.sort((a, b) => b._price - a._price); break;
            case "sold-desc": list.sort((a, b) => b._sold - a._sold); break;
            case "score-desc": list.sort((a, b) => b._score - a._score); break;
            case "title-asc": list.sort((a, b) => String(a.title).localeCompare(String(b.title))); break;
            default: break;
        }

        return list;
    }

    // ========= Render =========
    function render() {
        const list = applyFilters();

        // Count
        $("#resultCount").textContent = `Tìm thấy ${list.length.toLocaleString("vi-VN")} sản phẩm`;

        // Pagination
        const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
        if (STATE.page > totalPages) STATE.page = totalPages;
        const start = (STATE.page - 1) * PAGE_SIZE;
        const pageItems = list.slice(start, start + PAGE_SIZE);

        renderGrid(pageItems);
        renderPager(totalPages);
        pushURL();
    }

    function renderGrid(items) {
        const grid = $("#categoryGrid");
        if (!grid) return;

        grid.innerHTML = items.map(p => {
            const pid = p._id;
            const href = `/Home/ProductDetail?id=${encodeURIComponent(pid)}`;
            const percent = p._hasOld && p._old ? `${Math.round((p._price / p._old - 1) * 100)}%` : (p.discount || "");
            return `
      <div class="col">
        <article class="product-card"
          data-id="${escapeHtml(pid)}"
          data-name="${escapeHtml(p.title)}"
          data-price="${p._price}"
          data-img="${escapeHtml(p.image || '')}">
          <div class="product-card__img-wrap">
            <a href="${href}">
              <img src="${escapeHtml(p.image || '')}" alt class="product-card__thumb">
            </a>
          </div>
          <h3 class="product-card__title">
            <a href="${href}">${escapeHtml(p.title)}</a>
          </h3>
          <div class="product-card__tag">
            ${(p._tags || []).map(tag => `<p>${escapeHtml(tag)}</p>`).join('')}
          </div>

          <p class="product-card__price">${moneyVND(p._price)}</p>
          <div class="product-card__list-old">
            <p class="product-card__price-old">${p._hasOld ? moneyVND(p._old) : ""}</p>
            <p class="percent">${percent || ""}</p>
          </div>

          <div class="product-card__row">
            <img src="${window.appConfig?.contentPath || '/Content'}/icons/star.svg" alt class="product-card__star">
            <span class="product-card__score">${p._score ? String(p._score) : ""}</span>
            <p class="vote-txt">• Đã bán ${p.sold || ""}</p>
          </div>
          <button class="btn-add-cart" data-add-to-cart>Thêm vào giỏ</button>
        </article>
      </div>`;
        }).join("");
    }

    function renderPager(totalPages) {
        const wrap = $("#pager");
        if (!wrap) return;
        const btn = (p, label, dis = false, cur = false) =>
            `<button class="btn ${cur ? 'btn--primary' : ''}" data-page="${p}" ${dis ? 'disabled' : ''}>${label}</button>`;

        const parts = [];
        parts.push(btn(Math.max(1, STATE.page - 1), "‹ Trước", STATE.page === 1));
        // simple number pager
        const windowSize = 3;
        const from = Math.max(1, STATE.page - windowSize);
        const to = Math.min(totalPages, STATE.page + windowSize);
        for (let i = from; i <= to; i++) parts.push(btn(i, i, false, i === STATE.page));
        parts.push(btn(Math.min(totalPages, STATE.page + 1), "Sau ›", STATE.page === totalPages));

        wrap.innerHTML = parts.join("");
    }

    // ========= Events =========
    function wireUI() {
        document.addEventListener("click", (e) => {
            const addBtn = e.target.closest('.btn-add-cart:not([data-add-to-cart])');
            if (!addBtn) return;

            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation(); 

            const card = addBtn.closest('.product-card');
            if (!card) return;

            const item = {
                id: (card.dataset.id || '').trim(),
                name: card.dataset.name || "",
                price: parseInt(card.dataset.price, 10) || 0,
                img: card.dataset.img || "",
                qty: 1
            };
            if (!item.id) return;

            // Check user đã đăng nhập
            const currentUser = window.Auth?.getCurrentUser?.() || null;
            
            if (!currentUser || !currentUser.id) {
              // Chưa đăng nhập: CHỈ lưu vào localStorage
              window.cartStore?.add(item);
              window.renderMiniCart?.();
              console.log('[category] Chưa đăng nhập, đã lưu vào localStorage:', item.name);
              return;
            }
            
            // Đã đăng nhập: CHỈ lưu vào SQL, KHÔNG lưu vào localStorage
            (async () => {
              try {
                const token = document.querySelector('input[name="__RequestVerificationToken"]')?.value;
                if (!token) {
                  console.warn('[category] Không có AntiForgeryToken');
                  return;
                }
                
                const response = await fetch('/Cart/AddItem', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                  },
                  body: `productId=${encodeURIComponent(item.id)}&productName=${encodeURIComponent(item.name || '')}&price=${item.price}&productImage=${encodeURIComponent(item.img || '')}&quantity=${item.qty || 1}&__RequestVerificationToken=${encodeURIComponent(token)}`
                });
                const result = await response.json();
                if (result.success) {
                  console.log('[category] Đã lưu vào SQL (không lưu localStorage):', item.name);
                  // Reload cart từ server
                  setTimeout(() => {
                    if (window.Auth?.getCurrentUser?.() && window.syncCartFromServer) {
                      window.syncCartFromServer();
                    }
                  }, 100);
                } else {
                  console.warn('[category] Lỗi lưu vào SQL:', result.message);
                }
              } catch (e) {
                console.warn('[category] Lỗi sync server:', e);
              }
            })();
        });


        // Facet checkboxes
        document.addEventListener("change", (e) => {
            const cb = e.target.closest("input[type=checkbox][data-facet]");
            if (!cb) return;
            const facet = cb.dataset.facet;
            const val = cb.value;
            const arr = facet === "brand" ? STATE.brands
                : facet === "type" ? STATE.types
                    : STATE.tags;

            if (cb.checked) {
                if (!arr.includes(val)) arr.push(val);
            } else {
                const i = arr.indexOf(val);
                if (i > -1) arr.splice(i, 1);
            }
            STATE.page = 1;
            render();
        });

        // Search
        $("#flt-q")?.addEventListener("input", debounce(() => {
            STATE.q = $("#flt-q").value.trim();
            STATE.page = 1;
            render();
        }, 300));

        // Price min/max
        const syncMinMax = () => {
            const vmin = toNumber($("#flt-min").value);
            const vmax = toNumber($("#flt-max").value);
            STATE.min = $("#flt-min").value.trim() ? vmin : null;
            STATE.max = $("#flt-max").value.trim() ? (vmax || 0) : null;
            STATE.page = 1;
            render();
        };
        $("#flt-min")?.addEventListener("change", syncMinMax);
        $("#flt-max")?.addEventListener("change", syncMinMax);

        // Preset price buttons
        $$(".spec-list [data-prerange]").forEach(b => {
            b.addEventListener("click", () => {
                const [a, bv] = b.getAttribute("data-prerange").split("-");
                const min = a ? parseInt(a, 10) : null;
                const max = bv ? parseInt(bv, 10) : null;
                $("#flt-min").value = min ? min.toLocaleString("vi-VN") : "";
                $("#flt-max").value = max ? max.toLocaleString("vi-VN") : "";
                syncMinMax();
            });
        });

        // Sort
        $("#sortSel")?.addEventListener("change", () => {
            STATE.sort = $("#sortSel").value;
            STATE.page = 1;
            render();
        });

        // Pager
        $("#pager")?.addEventListener("click", (e) => {
            const btn = e.target.closest("button[data-page]");
            if (!btn) return;
            const p = parseInt(btn.dataset.page, 10);
            if (!isFinite(p)) return;
            STATE.page = Math.max(1, p);
            render();
        });

        // Clear all
        $("#flt-clear")?.addEventListener("click", () => {
            STATE = { q: "", brands: [], types: [], tags: [], min: null, max: null, sort: "", page: 1 };
            hydrateFromURL(); // để sync tick = off
            // tắt hết checkbox
            $$("#flt-brands input, #flt-types input, #flt-tags input").forEach(cb => cb.checked = false);
            $("#flt-q").value = "";
            $("#flt-min").value = "";
            $("#flt-max").value = "";
            $("#sortSel").value = "";
            render();
        });
    }

    function debounce(fn, wait = 300) {
        let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
    }
    function initPriceSlider() {
        const slider = document.querySelector('.price-slider');
        if (!slider) return;

        const minR = slider.querySelector('.ps-thumb--min');
        const maxR = slider.querySelector('.ps-thumb--max');
        const fill = slider.querySelector('.ps-fill');
        const tipMin = slider.querySelector('.ps-tip--min');
        const tipMax = slider.querySelector('.ps-tip--max');
        const Imin = document.getElementById('flt-min');
        const Imax = document.getElementById('flt-max');

        const CAP_MIN = Number(slider.dataset.min ?? minR.min ?? 0);
        const CAP_MAX = Number(slider.dataset.max ?? maxR.max ?? 0);
        const CAP_STEP = Number(slider.dataset.step ?? minR.step ?? 1);

        minR.min = maxR.min = String(CAP_MIN);
        minR.max = maxR.max = String(CAP_MAX);
        minR.step = maxR.step = String(CAP_STEP);

        const vn = n => (n || 0).toLocaleString('vi-VN');
        const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
        const span = Math.max(1, CAP_MAX - CAP_MIN);

        function draw(pushState = true) {
            const a = Number(minR.value);
            const b = Number(maxR.value);
            const L = ((Math.min(a, b) - CAP_MIN) / span) * 100;
            const R = ((Math.max(a, b) - CAP_MIN) / span) * 100;

            if (fill) { fill.style.left = `${L}%`; fill.style.width = `${R - L}%`; }
            if (tipMin) { tipMin.style.left = `${L}%`; tipMin.textContent = vn(Math.min(a, b)); }
            if (tipMax) { tipMax.style.left = `${R}%`; tipMax.textContent = vn(Math.max(a, b)); }

            if (pushState) {
                if (Imin) Imin.value = vn(Math.min(a, b));
                if (Imax) Imax.value = vn(Math.max(a, b));
                STATE.min = Math.min(a, b);
                STATE.max = Math.max(a, b);
                STATE.page = 1;
                render();
            }
        }

        minR.addEventListener('input', () => { if (+minR.value > +maxR.value) maxR.value = minR.value; draw(true); });
        maxR.addEventListener('input', () => { if (+maxR.value < +minR.value) minR.value = maxR.value; draw(true); });

        function syncFromInputs() {
            const a = clamp(toNumber(Imin?.value), CAP_MIN, CAP_MAX);
            const b = clamp(toNumber(Imax?.value) || CAP_MAX, CAP_MIN, CAP_MAX);
            minR.value = String(Math.min(a, b));
            maxR.value = String(Math.max(a, b));
            draw(true);
        }
        Imin?.addEventListener('change', syncFromInputs);
        Imax?.addEventListener('change', syncFromInputs);

        draw(false);
    }
    const sidebar = document.querySelector('.category-sidebar');
    const openBtn = document.getElementById('btn-open-filters');
    const closeBtn = document.getElementById('btn-close-filters');
    const backdrop = document.getElementById('filterBackdrop');

    const open = () => { sidebar?.classList.add('is-open'); backdrop?.classList.add('is-open'); document.body.style.overflow = 'hidden'; };
    const close = () => { sidebar?.classList.remove('is-open'); backdrop?.classList.remove('is-open'); document.body.style.overflow = ''; };

    openBtn?.addEventListener('click', open);
    closeBtn?.addEventListener('click', close);
    backdrop?.addEventListener('click', close);

    const slider = document.querySelector('.price-slider');
    if (slider) {
        const minI = slider.querySelector('.ps-thumb--min');
        const maxI = slider.querySelector('.ps-thumb--max');
        const fill = slider.querySelector('.ps-fill');
        const tMin = slider.querySelector('.ps-tip--min');
        const tMax = slider.querySelector('.ps-tip--max');

        const min = +slider.dataset.min || 0;
        const max = +slider.dataset.max || 200000000;

        const fmt = (n) => n.toLocaleString('vi-VN');

        function update() {
            let v1 = Math.min(+minI.value, +maxI.value - (+maxI.step || 1));
            let v2 = Math.max(+maxI.value, v1 + (+minI.step || 1));
            if (+minI.value !== v1) minI.value = v1;
            if (+maxI.value !== v2) maxI.value = v2;

            const p1 = ((v1 - min) / (max - min)) * 100;
            const p2 = ((v2 - min) / (max - min)) * 100;

            fill.style.left = p1 + '%';
            fill.style.width = (p2 - p1) + '%';
            tMin.style.left = p1 + '%';
            tMax.style.left = p2 + '%';
            tMin.textContent = fmt(v1);
            tMax.textContent = fmt(v2);

            const inMin = document.getElementById('flt-min');
            const inMax = document.getElementById('flt-max');
            if (inMin) inMin.value = v1;
            if (inMax) inMax.value = v2;

        }

        ['input', 'change'].forEach(ev => {
            minI.addEventListener(ev, update);
            maxI.addEventListener(ev, update);
        });

        const inMin = document.getElementById('flt-min');
        const inMax = document.getElementById('flt-max');
        const toNum = (s) => Math.max(min, Math.min(max, parseInt(String(s).replace(/[^\d]/g, '')) || 0));
        function syncFromInputs() {
            minI.value = toNum(inMin.value);
            maxI.value = toNum(inMax.value);
            update();
        }
        inMin?.addEventListener('change', syncFromInputs);
        inMax?.addEventListener('change', syncFromInputs);

        update();
    }

    const c = document.getElementById('resultCount');
    const cm = document.getElementById('resultCountMobile');
    if (c && cm) {
        const mo = new MutationObserver(() => cm.textContent = c.textContent);
        mo.observe(c, { childList: true, subtree: true, characterData: true });
        cm.textContent = c.textContent;
    }
})();
