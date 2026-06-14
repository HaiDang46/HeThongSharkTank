// assets/js/profile-sidebar.js
(() => {
  "use strict";

  const LOG_TAG = "[profile-sidebar]";
  const log = (...args) => console.log(LOG_TAG, ...args);
  const warn = (...args) => console.warn(LOG_TAG, ...args);

  // ===== Toast mini (fallback nếu trang chưa có toast) =====
  function sidebarToast(msg, type = "info", ms = 1800) {
    try { if (typeof toast === "function") return toast(msg, type, ms); } catch {}
    const el = document.createElement("div");
    el.className = "toast toast--" + type;
    Object.assign(el.style, {
      position: "fixed", top: "12px", right: "12px",
      background: type === "error" ? "#ef4444" : type === "success" ? "#22c55e" : "#2563eb",
      color: "#fff", padding: "10px 12px", borderRadius: "10px", zIndex: 9999,
      boxShadow: "0 6px 20px rgba(0,0,0,.15)", fontSize: "14px"
    });
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), ms);
  }

  // ===== Resize ảnh -> dataURL để lưu nhẹ nhàng =====
  function resizeImageToDataURL(file, maxSide = 256, mime = "image/jpeg", quality = 0.85) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const fr = new FileReader();
      fr.onload = () => {
        img.onload = () => {
          const ratio = Math.min(maxSide / img.width, maxSide / img.height, 1);
          const w = Math.round(img.width * ratio);
          const h = Math.round(img.height * ratio);

          const canvas = document.createElement("canvas");
          canvas.width = w; canvas.height = h;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, w, h);
          try { resolve(canvas.toDataURL(mime, quality)); }
          catch (e) { reject(e); }
        };
        img.onerror = reject;
        img.src = fr.result;
      };
      fr.onerror = reject;
      fr.readAsDataURL(file);
    });
  }

  // ===== Render sidebar vào đúng placeholder =====
  function renderProfileSidebar(targetEl) {
    const wrap = typeof targetEl === "string" ? document.querySelector(targetEl) : targetEl;
    if (!wrap) return warn("Không tìm thấy placeholder #profile-sidebar");

    // Chống gán nhầm vào vùng quá rộng
    if (["HTML", "BODY"].includes(wrap.tagName) || wrap.matches("main, .container, .profile, .profile-container, .row")) {
      warn("Target quá rộng, bỏ qua để tránh mất layout.");
      return;
    }

    wrap.innerHTML = `
      <aside class="profile__sidebar">
        <div class="profile-user" style="position:relative">
          <img src="${window.appConfig?.contentPath || '/Content'}/img/avatar/avatar-3.png"
               alt="Ảnh đại diện"
               class="profile-user__avatar"
               id="profile-avatar"
               style="cursor:pointer" />
          <h1 class="profile-user__name" id="profile-name">Người dùng</h1>
          <p class="profile-user__desc" id="profile-registered">Đăng ký: —</p>
        </div>

        <div class="profile-menu">
          <h3 class="profile-menu__title">Quản lý tài khoản</h3>
          <ul class="profile-menu__list">
            <li>
              <a href="${window.appConfig?.profileEditUrl || '/Profile/EditPersonalInfo'}" class="profile-menu__link" data-link="edit">
                <span class="profile-menu__icon"><img src="${window.appConfig?.contentPath || '/Content'}/icons/profile.svg" alt="Hồ sơ" class="icon" /></span>
                Thông tin cá nhân
              </a>
            </li>
            <li>
              <a href="${window.appConfig?.changePasswordUrl || '/Profile/ChangePassword'}" class="profile-menu__link" data-link="change-pass">
                <span class="profile-menu__icon"><img src="${window.appConfig?.contentPath || '/Content'}/icons/shield.svg" alt="Đổi mật khẩu" class="icon" /></span>
                Đổi mật khẩu
              </a>
            </li>
            <li>
              <a href="${window.appConfig?.addressesUrl || '/Profile/Addresses'}" class="profile-menu__link">
                <span class="profile-menu__icon"><img src="${window.appConfig?.contentPath || '/Content'}/icons/location.svg" alt="Địa chỉ" class="icon" /></span>
                Địa chỉ <span id="address-count-badge" style="margin-left: 8px; background: #2563eb; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px;">0</span>
              </a>
            </li>
            <li>
              <a href="#!" class="profile-menu__link">
                <span class="profile-menu__icon"><img src="${window.appConfig?.contentPath || '/Content'}/icons/message-2.svg" alt="Quyền riêng tư" class="icon" /></span>
                Liên lạc & quyền riêng tư
              </a>
            </li>
          </ul>
        </div>

        <div class="profile-menu">
          <h3 class="profile-menu__title">Sản phẩm của tôi</h3>
          <ul class="profile-menu__list">
            <li>
              <a href="#!" class="profile-menu__link">
                <span class="profile-menu__icon"><img src="${window.appConfig?.contentPath || '/Content'}/icons/download.svg" alt="Mua lại" class="icon" /></span>
                Mua lại
              </a>
            </li>
            <li>
              <a href="#!" class="profile-menu__link">
                <span class="profile-menu__icon"><img src="${window.appConfig?.contentPath || '/Content'}/icons/heart.svg" alt="Danh sách" class="icon" /></span>
                Danh sách yêu thích
              </a>
            </li>
            <li>
              <a href="#!" class="profile-menu__link">
                <span class="profile-menu__icon"><img src="${window.appConfig?.contentPath || '/Content'}/icons/gift-2.svg" alt="Quà tặng" class="icon" /></span>
                Đăng ký quà tặng
              </a>
            </li>
            <li>
              <a href="/Profile/Orders" class="profile-menu__link">
                <span class="profile-menu__icon"><img src="${window.appConfig?.contentPath || '/Content'}/icons/bag.svg" alt="Sản phẩm Đã đặt" class="icon" /></span>
                Sản phẩm Đã đặt
              </a>
            </li>
          </ul>
        </div>

        <div class="profile-menu">
          <h3 class="profile-menu__title">Gói & dịch vụ</h3>
          <ul class="profile-menu__list">
            <li>
              <a href="#!" class="profile-menu__link">
                <span class="profile-menu__icon"><img src="${window.appConfig?.contentPath || '/Content'}/icons/shield.svg" alt="Bảo vệ" class="icon" /></span>
                Gói bảo vệ
              </a>
            </li>
          </ul>
        </div>

        <div class="profile-menu">
          <h3 class="profile-menu__title">Hỗ trợ khách hàng</h3>
          <ul class="profile-menu__list">
            <li>
              <a href="#!" class="profile-menu__link">
                <span class="profile-menu__icon"><img src="${window.appConfig?.contentPath || '/Content'}/icons/info.svg" alt="Trợ giúp" class="icon" /></span>
                Trợ giúp
              </a>
            </li>
            <li>
              <a href="#!" class="profile-menu__link">
                <span class="profile-menu__icon"><img src="${window.appConfig?.contentPath || '/Content'}/icons/danger.svg" alt="Điều khoản" class="icon" /></span>
                Điều khoản sử dụng
              </a>
            </li>
          </ul>
        </div>
      </aside>
    `;

    // Đổ dữ liệu user + avatar
    try {
      const me = (window.Auth && typeof Auth.me === "function") ? Auth.me() : null;
      const nameEl = wrap.querySelector("#profile-name");
      const regEl  = wrap.querySelector("#profile-registered");
      const avatarNode = wrap.querySelector("#profile-avatar");
      const addressCountBadge = wrap.querySelector("#address-count-badge");

      if (me) {
        if (nameEl) nameEl.textContent = me.name || "Người dùng";
        try {
          const users = JSON.parse(localStorage.getItem("users") || "[]");
          const u = users.find((x) => x.id === me.id);
          if (regEl) {
            if (u?.createdAt) {
              const d = new Date(u.createdAt);
              regEl.textContent = "Đăng ký: " + d.toLocaleDateString("vi-VN", { day: "2-digit", month: "short", year: "numeric" });
            } else regEl.textContent = "Đăng ký: —";
          }
          const key = `gm_avatar_${me.id}`;
          const saved = u?.avatar || localStorage.getItem(key);
          if (avatarNode && saved) avatarNode.src = saved;
        } catch {}
      }
      
      // Load số địa chỉ từ server
      if (addressCountBadge && me && me.id) {
        loadAddressCount(addressCountBadge);
      }
    } catch (e) {
      warn("Lỗi đổ dữ liệu:", e);
    }

    // Hàm load số địa chỉ từ server
    function loadAddressCount(badgeEl) {
      if (!badgeEl) return;
      
      fetch('/Shipping/GetAddresses', {
        cache: 'no-cache',
        headers: { 'Cache-Control': 'no-cache' }
      })
      .then(response => {
        if (!response.ok) throw new Error('Failed to fetch addresses');
        return response.json();
      })
      .then(data => {
        if (data.success && Array.isArray(data.addresses)) {
          const count = data.addresses.length;
          badgeEl.textContent = count;
          badgeEl.style.display = count > 0 ? 'inline-block' : 'none';
        } else {
          badgeEl.textContent = '0';
          badgeEl.style.display = 'none';
        }
      })
      .catch(error => {
        console.warn('[profile-sidebar] Error loading address count:', error);
        badgeEl.textContent = '0';
        badgeEl.style.display = 'none';
      });
    }

    // Active link theo trang
    const path = location.pathname.split("/").pop();
    wrap.querySelectorAll(".profile-menu__link").forEach((a) => {
      const href = a.getAttribute("href") || "";
      if (href && path && href.endsWith(path)) a.classList.add("is-active");
    });

    // ==== ĐỔI ẢNH: ObjectURL preview ngay + lưu dataURL ====
    const avatarClickEl = wrap.querySelector("#profile-avatar");

    const openPickerOnce = () => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      Object.assign(input.style, { position: "fixed", left: "-9999px", width: "0", height: "0", opacity: 0 });
      document.body.appendChild(input);

      input.addEventListener("change", async (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) { document.body.removeChild(input); return; }
        if (!file.type.startsWith("image/")) {
          sidebarToast("Vui lòng chọn một file ảnh.", "error");
          document.body.removeChild(input);
          return;
        }
        if (file.size > 5 * 1024 * 1024) {
          sidebarToast("Ảnh quá lớn (>5MB). Vui lòng chọn ảnh nhỏ hơn.", "error");
          document.body.removeChild(input);
          return;
        }

        const avatarNode = wrap.querySelector("#profile-avatar");

        // Preview ngay
        let previewUrl = null;
        try {
          previewUrl = URL.createObjectURL(file);
          if (avatarNode) {
            avatarNode.src = previewUrl;
            avatarNode.onload = () => { try { URL.revokeObjectURL(previewUrl); } catch {} };
          }
        } catch {}

        // Resize + lưu
        try {
          const dataURL = await resizeImageToDataURL(file, 256, "image/jpeg", 0.85);

          const me = (window.Auth && typeof Auth.me === "function") ? Auth.me() : null;
          if (me) {
            try { localStorage.setItem(`gm_avatar_${me.id}`, dataURL); } catch {}
            try {
              const users = JSON.parse(localStorage.getItem("users") || "[]");
              const idx = users.findIndex((u) => u.id === me.id);
              if (idx > -1) {
                users[idx].avatar = dataURL;
                localStorage.setItem("users", JSON.stringify(users));
              }
            } catch {}
          }

          if (avatarNode) avatarNode.src = dataURL;

          sidebarToast("Cập nhật ảnh đại diện thành công.", "success");
          document.dispatchEvent(new Event("avatar-updated"));
        } catch (err) {
          console.error(err);
          sidebarToast("Không thể xử lý ảnh. Vui lòng thử lại.", "error");
        } finally {
          document.body.removeChild(input);
        }
      }, { once: true });

      try { input.value = ""; } catch {}
      input.click();
    };

    avatarClickEl?.addEventListener("click", openPickerOnce);

    log("Rendered sidebar.");
  }

  // ===== Chờ placeholder xuất hiện (kể cả load động) rồi render =====
  function mountWhenReady() {
    const target = document.querySelector("#profile-sidebar");
    if (target) {
      renderProfileSidebar(target);
      return;
    }
    const mo = new MutationObserver(() => {
      const t = document.querySelector("#profile-sidebar");
      if (t) { mo.disconnect(); renderProfileSidebar(t); }
    });
    mo.observe(document.documentElement, { childList: true, subtree: true });
  }

  document.addEventListener("DOMContentLoaded", mountWhenReady);
})();
