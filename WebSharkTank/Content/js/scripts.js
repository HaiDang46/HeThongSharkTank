// Chỉ khai báo nếu chưa có (tránh conflict với jQuery)
if (typeof window.$ === 'undefined' || typeof window.$ !== 'function' || !window.$.fn) {
  window.$ = document.querySelector.bind(document);
}
if (typeof window.$$ === 'undefined') {
  window.$$ = document.querySelectorAll.bind(document);
}
// Use var to allow redeclaration if script loads multiple times (safe fallback)
// eslint-disable-next-line no-var
var $ = window.$ || document.querySelector.bind(document);
// eslint-disable-next-line no-var
var $$ = window.$$ || document.querySelectorAll.bind(document);


function load(selector, path) {
    const cached = localStorage.getItem(path);
    if (cached) {
        $(selector).innerHTML = cached;
    }

    fetch(path)
        .then((res) => res.text())
        .then((html) => {
            if (html !== cached) {
                $(selector).innerHTML = html;
                localStorage.setItem(path, html);
            }
        })
        .finally(() => {
            window.dispatchEvent(new Event("template-loaded"));
        });
}


function isHidden(element) {
    if (!element || !(element instanceof Element)) return true;

    try {
        if (window.getComputedStyle(element).display === "none") {
            return true;
        }

        let parent = element.parentElement;
        while (parent) {
            if (window.getComputedStyle(parent).display === "none") {
                return true;
            }
            parent = parent.parentElement;
        }
    } catch (e) {
        // Nếu có lỗi, coi như element bị ẩn
        return true;
    }

    return false;
}

function debounce(func, timeout = 300) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => {
            func.apply(this, args);
        }, timeout);
    };
}


const calArrowPos = debounce(() => {
    const dropdownList = $(".js-dropdown-list");
    if (!dropdownList || isHidden(dropdownList)) return;

    const items = $$(".js-dropdown-list > li");

    items.forEach((item) => {
        const arrowPos = item.offsetLeft + item.offsetWidth / 2;
        item.style.setProperty("--arrow-left-pos", `${arrowPos}px`);
    });
});

window.addEventListener("resize", calArrowPos);

window.addEventListener("template-loaded", calArrowPos);


window.addEventListener("template-loaded", handleActiveMenu);

function handleActiveMenu() {
    const dropdowns = $$(".js-dropdown");
    const menus = $$(".js-menu-list");
    const activeClass = "menu-column__item--active";

    const removeActive = (menu) => {
        menu.querySelector(`.${activeClass}`)?.classList.remove(activeClass);
    };

    const init = () => {
        menus.forEach((menu) => {
            const items = menu.children;
            if (!items.length) return;

            removeActive(menu);
            if (window.innerWidth > 991) items[0].classList.add(activeClass);

            Array.from(items).forEach((item) => {
                item.onmouseenter = () => {
                    if (window.innerWidth <= 991) return;
                    removeActive(menu);
                    item.classList.add(activeClass);
                };
                item.onclick = () => {
                    if (window.innerWidth > 991) return;
                    removeActive(menu);
                    item.classList.add(activeClass);
                    item.scrollIntoView();
                };
            });
        });
    };

    init();

    dropdowns.forEach((dropdown) => {
        dropdown.onmouseleave = () => init();
    });
}


window.addEventListener("template-loaded", initJsToggle);

function initJsToggle() {
    // Lưu danh sách các toggle buttons và targets
    const toggleButtons = [];
    
    $$(".js-toggle").forEach((button) => {
        const target = button.getAttribute("toggle-target");
        if (!target) {
            return; // Bỏ qua nếu không có target
        }
        
        const targetElement = $(target);
        if (!targetElement || !(targetElement instanceof Element)) {
            return; // Bỏ qua nếu không tìm thấy element hoặc không phải Element
        }
        
        // Lưu button và target vào mảng
        toggleButtons.push({ button: button, target: target, targetElement: targetElement });
        
        button.onclick = (e) => {
            e.preventDefault();

            if (!targetElement || !(targetElement instanceof Element)) {
                return;
            }
            const isHidden = targetElement.classList.contains("hide");

            requestAnimationFrame(() => {
                if (targetElement && targetElement instanceof Element) {
                    targetElement.classList.toggle("hide", !isHidden);
                    targetElement.classList.toggle("show", isHidden);
                }
            });
        };
    });
    
    // Sử dụng một event listener duy nhất cho document
    if (toggleButtons.length > 0) {
        document.addEventListener('click', function(e) {
            toggleButtons.forEach(({ button, target, targetElement }) => {
                if (targetElement && targetElement instanceof Element && button instanceof Element) {
                    try {
                        // Kiểm tra xem click có nằm trong target element không
                        const clickedInTarget = targetElement.contains(e.target);
                        // Kiểm tra xem click có nằm trong button không
                        const clickedInButton = button.contains(e.target);
                        
                        if (!clickedInTarget && !clickedInButton) {
                            const isHidden = targetElement.classList.contains("hide");
                            if (!isHidden) {
                                button.click();
                            }
                        }
                    } catch (err) {
                        // Bỏ qua lỗi nếu có
                        console.warn('Error in toggle click handler:', err);
                    }
                }
            });
        });
    }
}

window.addEventListener("template-loaded", () => {
    const links = $$(".js-dropdown-list > li > a");

    links.forEach((link) => {
        link.onclick = () => {
            if (window.innerWidth > 991) return;
            const item = link.closest("li");
            item.classList.toggle("navbar__item--active");
        };
    });
});

window.addEventListener("template-loaded", () => {
    const tabsSelector = "prod-tab__item";
    const contentsSelector = "prod-tab__content";

    const tabActive = `${tabsSelector}--current`;
    const contentActive = `${contentsSelector}--current`;

    const tabContainers = $$(".js-tabs");
    tabContainers.forEach((tabContainer) => {
        const tabs = tabContainer.querySelectorAll(`.${tabsSelector}`);
        const contents = tabContainer.querySelectorAll(`.${contentsSelector}`);
        tabs.forEach((tab, index) => {
            tab.onclick = () => {
                tabContainer.querySelector(`.${tabActive}`)?.classList.remove(tabActive);
                tabContainer.querySelector(`.${contentActive}`)?.classList.remove(contentActive);
                tab.classList.add(tabActive);
                contents[index].classList.add(contentActive);
            };
        });
    });
});

window.addEventListener("template-loaded", () => {
    const switchBtn = document.querySelector("#switch-theme-btn");
    if (switchBtn) {
        switchBtn.onclick = function () {
            const isDark = localStorage.dark === "true";
            document.querySelector("html").classList.toggle("dark", !isDark);
            localStorage.setItem("dark", !isDark);
            switchBtn.querySelector("span").textContent = isDark ? "Dark mode" : "Light mode";
        };
        const isDark = localStorage.dark === "true";
        switchBtn.querySelector("span").textContent = isDark ? "Light mode" : "Dark mode";
    }
});

const isDark = localStorage.dark === "true";
document.querySelector("html").classList.toggle("dark", isDark);
// ===== Toast fallback (nếu chưa có) =====
window.toast = window.toast || function (msg, type = "info", ms = 1800) {
  const el = document.createElement("div");
  el.className = "toast toast--" + type;
  Object.assign(el.style, {
    position: "fixed", top: "30px", right: "12px",
    background: type === "error" ? "#ef4444" : type === "success" ? "#22c55e" : "#2563eb",
    color: "#fff", padding: "10px 12px", borderRadius: "10px", zIndex: 999999,
    boxShadow: "0 6px 20px rgba(0,0,0,.15)", fontSize: "16px"
  });
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), ms);
};

document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-add-to-cart], .js-add-to-cart");
  if (!btn) return;

  // Bỏ qua button trong ProductDetail (có class prod-info__add-to-cart)
  // Vì product-detail.js đã xử lý riêng
  if (btn.classList.contains('prod-info__add-to-cart')) {
    return;
  }

  // Kiểm tra đăng nhập trước khi hiển thị toast
  const currentUser = window.Auth?.getCurrentUser?.() || null;
  if (!currentUser || !currentUser.id) {
    // Chưa đăng nhập - không hiển thị toast, để SweetAlert xử lý
    return;
  }

  // Chỉ hiển thị toast khi đã đăng nhập và thực sự thêm vào giỏ hàng thành công
  // (Toast sẽ được hiển thị từ các handler riêng trong app.js, cart.js, product-detail.js)
  // Không hiển thị toast ở đây để tránh duplicate
});
(function () {
  const DESKTOP = ()=> window.innerWidth > 991;
  const html = document.documentElement;
  const body = document.body;
  const backdrop = document.getElementById('catBackdrop');

  let locked = false, scrollY = 0;

  function setDropdownTop() {
    const cart = document.querySelector('.header__cart, #cartBtn, .js-cart');
    const navbar = document.querySelector('#navbar') || document.querySelector('.header');
    let topPx = 56, r;

    if (cart && (r = cart.getBoundingClientRect())) topPx = r.bottom + 6 + window.scrollY;
    else if (navbar && (r = navbar.getBoundingClientRect())) topPx = r.bottom + 2 + window.scrollY;

    html.style.setProperty('--catTop', topPx + 'px');
  }

  function lockScroll() {
    if (locked) return;
    scrollY = window.scrollY || window.pageYOffset;

    const sbw = window.innerWidth - document.documentElement.clientWidth;
    body.style.paddingRight = sbw > 0 ? sbw + 'px' : '';
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';

    backdrop?.classList.add('is-open');
    locked = true;
  }

  function unlockScroll() {
    if (!locked) return;
    body.style.position = '';
    body.style.top = '';
    body.style.left = '';
    body.style.right = '';
    body.style.width = '';
    body.style.paddingRight = '';
    window.scrollTo(0, scrollY);
    backdrop?.classList.remove('is-open');
    locked = false;
  }

  // Toggle danh mục gốc (nút "Danh mục sản phẩm")
  const catToggle = document.querySelector('.js-cat-toggle');
  const rootItem  = catToggle?.closest('li');

  if (catToggle && rootItem) {
    catToggle.addEventListener('click', (e) => {
      if (DESKTOP()) return; // desktop để hover
      e.preventDefault();

      rootItem.parentElement.querySelectorAll('.navbar__item--active').forEach(li=>{
        if (li !== rootItem) li.classList.remove('navbar__item--active');
      });

      const willOpen = !rootItem.classList.contains('navbar__item--active');
      rootItem.classList.toggle('navbar__item--active', willOpen);

      setDropdownTop();
      willOpen ? lockScroll() : unlockScroll();
    });
  }

  document.addEventListener('click', (e) => {
    if (DESKTOP()) return;

    const clickedInsideDropdown = e.target.closest('.js-dropdown');
    const clickedToggle = e.target.closest('.js-cat-toggle, .js-dropdown-list > li > a');

    // Click ra ngoài dropdown: đóng và mở khóa body
    if (!clickedInsideDropdown && !clickedToggle) {
      document.querySelectorAll('.js-dropdown-list .navbar__item--active')
        .forEach(li => li.classList.remove('navbar__item--active'));
      unlockScroll();
    }
  }, {passive:true});

  // Đóng khi bấm backdrop
  backdrop?.addEventListener('click', () => {
    document.querySelectorAll('.js-dropdown-list .navbar__item--active')
      .forEach(li => li.classList.remove('navbar__item--active'));
    unlockScroll();
  });

  // Recalc top khi cuộn/resize (chỉ mobile)
  const updateTop = () => { if (!DESKTOP()) setDropdownTop(); };
  window.addEventListener('template-loaded', updateTop);
  window.addEventListener('scroll', updateTop, {passive:true});
  window.addEventListener('resize', updateTop);
})();

