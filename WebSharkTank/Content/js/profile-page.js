// assets/js/profile-page.js

// ===== Require login =====
if (window.Auth && typeof Auth.requireAuth === "function") {
  Auth.requireAuth(); // Sử dụng default từ appConfig
}

// ===== Helpers chung =====
// Kiểm tra xem moneyVND đã được khai báo chưa (có thể từ app.js)
if (typeof window.moneyVND === 'undefined') {
  window.moneyVND = (n) => (n || 0).toLocaleString("vi-VN", { style: "currency", currency: "VND" });
}
const moneyVND = window.moneyVND;
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const telRe = /^[0-9+()\s-]{8,}$/;

const toast = (msg, type = "info", ms = 1800) => {
  const el = document.createElement("div");
  el.className = "toast toast--" + type;
  Object.assign(el.style, {
    position: "fixed",
    top: "12px",
    right: "12px",
    background: type === "error" ? "#ef4444" : type === "success" ? "#22c55e" : "#2563eb",
    color: "#fff",
    padding: "10px 12px",
    borderRadius: "10px",
    zIndex: 9999,
    boxShadow: "0 6px 20px rgba(0,0,0,.15)",
    fontSize: "14px",
  });
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), ms);
};

const show = (id, isShow) => {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.display = isShow ? "" : "none";
};

function getCart() {
  try {
    return JSON.parse(localStorage.getItem("cart")) || [];
  } catch {
    return [];
  }
}

// ===== Flash message sau chuyển trang =====
(function flashFromSession() {
  try {
    const raw = sessionStorage.getItem("gm_flash");
    if (!raw) return;
    const data = JSON.parse(raw);
    if (data?.text) {
      toast(data.text, data.type || "info", 2500);
    }
  } catch {}
  sessionStorage.removeItem("gm_flash");
})();

// ===== Đổ thông tin user (áp dụng cho cả profile.html & edit-personal-info.html) =====
(function renderProfileCommon() {
  if (!window.Auth || typeof Auth.me !== "function") return;
  const me = Auth.me();
  if (!me) return;

  // Các field có mặt ở profile.html
  const nameEl = document.getElementById("profile-name");
  const emailEl = document.getElementById("profile-email");
  const holder1 = document.getElementById("card-holder-1");
  const holder2 = document.getElementById("card-holder-2");
  const regEl = document.getElementById("profile-registered");

  if (nameEl) nameEl.textContent = me.name || "Người dùng";
  if (emailEl) emailEl.textContent = me.email || "—";
  if (holder1) holder1.textContent = me.name || "Người dùng";
  if (holder2) holder2.textContent = me.name || "Người dùng";

  try {
    const users = JSON.parse(localStorage.getItem("users") || "[]");
    const u = users.find((x) => x.id === me.id);
    if (regEl) {
      if (u?.createdAt) {
        const d = new Date(u.createdAt);
        regEl.textContent = `Đăng ký: ${d.toLocaleDateString("vi-VN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })}`;
      } else regEl.textContent = "Đăng ký: —";
    }
  } catch {}

  // Phone/Address nếu có lưu riêng
  const phoneEl = document.getElementById("profile-phone");
  const addrEl = document.getElementById("profile-address");
  if (phoneEl) phoneEl.textContent = localStorage.getItem("gm_user_phone") || "—";
  if (addrEl) addrEl.textContent = localStorage.getItem("gm_user_address") || "—";

  // Sidebar ở edit-personal-info.html (ẩn/hiện tùy layout)
  const sName = document.getElementById("sidebar-name");
  const sReg = document.getElementById("sidebar-registered");
  if (sName) sName.textContent = me.name || "Người dùng";
  if (sReg) {
    try {
      const users = JSON.parse(localStorage.getItem("users") || "[]");
      const u = users.find((x) => x.id === me.id);
      if (u?.createdAt) {
        const d = new Date(u.createdAt);
        sReg.textContent = "Đăng ký: " + d.toLocaleDateString("vi-VN", { day: "2-digit", month: "short", year: "numeric" });
      } else sReg.textContent = "Đăng ký: —";
    } catch {
      sReg.textContent = "Đăng ký: —";
    }
  }
})();

// ===== Render danh sách đã thêm vào giỏ (chỉ chạy ở profile.html khi có #favList) =====
(function renderFavList() {
  const listEl = document.getElementById("favList");
  const sumEl = document.getElementById("cart-summary");
  if (!listEl || !sumEl) return; // không có thì bỏ qua (không phải profile.html)

  const items = getCart();
  const count = items.reduce((s, x) => s + (x.qty || 0), 0);
  const subtotal = items.reduce((s, x) => s + (x.price || 0) * (x.qty || 0), 0);

  if (!items.length) {
    sumEl.textContent = "Chưa có sản phẩm nào trong giỏ hàng.";
    listEl.innerHTML = "";
    return;
  }

  sumEl.textContent = `${count} sản phẩm • Tạm tính: ${moneyVND(subtotal)}`;

  listEl.innerHTML = items
    .map(
      (item) => `
    <article class="favourite-item">
      <img src="${item.img || `${window.appConfig?.contentPath || '/Content'}/img/product/item-1.png`}" alt="${item.name || "Sản phẩm"}" class="favourite-item__thumb" />
      <div>
        <h3 class="favourite-item__title">${item.name || "Sản phẩm"}</h3>
        <div class="favourite-item__content" style="gap:12px;flex-wrap:wrap">
          <span class="favourite-item__price">${moneyVND(item.price || 0)}</span>
          <span style="opacity:.8">Số lượng: ${item.qty || 1}</span>
          <a class="btn btn--primary btn--rounded" href="/Home/ProductDetail?id=${encodeURIComponent(item.id || "")}">Xem chi tiết</a>
        </div>
      </div>
    </article>
    <div class="separate" style="--margin: 16px"></div>
  `
    )
    .join("");
})();

// ===== Logic trang Chỉnh sửa thông tin (khi có #profile-form) =====
(function wireEditForm() {
  const form = document.getElementById("profile-form");
  if (!form) return; // không phải edit-personal-info.html

  // Prefill form
  (function prefill() {
    const me = (window.Auth && Auth.me && Auth.me()) || null;
    if (!me) return;
    const nameEl = document.getElementById("full-name");
    const emailEl = document.getElementById("email-address");
    const phoneEl = document.getElementById("phone-number");
    if (nameEl) nameEl.value = me.name || "";
    if (emailEl) emailEl.value = me.email || "";
    try {
      const phone = localStorage.getItem("gm_user_phone") || "";
      if (phoneEl) phoneEl.value = phone;
    } catch {}
  })();

  // Submit
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("full-name")?.value.trim() || "";
    const email = (document.getElementById("email-address")?.value || "").trim().toLowerCase();
    const phone = document.getElementById("phone-number")?.value.trim() || "";
    const newPass = document.getElementById("password")?.value || "";
    const currentPass = document.getElementById("password-current")?.value || "";
    const confirmPass = document.getElementById("password-confirm")?.value || "";

    // ========== Validate dữ liệu cơ bản ==========
    let ok = true;

    // Tên
    show("err-name", !name);
    if (!name) ok = false;

    // Email
    const validEmail = emailRe.test(email);
    show("err-email", !validEmail);
    if (!validEmail) ok = false;

    // Điện thoại
    const validPhone = !phone || telRe.test(phone);
    show("err-phone", !validPhone);
    if (!validPhone) ok = false;

    // ======= Khối đổi mật khẩu (nếu người dùng nhập bất kỳ ô nào) =======
    const wantsChangePass = !!(newPass || currentPass || confirmPass);
    if (wantsChangePass) {
      // New password length
      const passLenOk = !!(newPass && newPass.length >= 6);
      show("err-pass", !passLenOk);
      if (!passLenOk) ok = false;

      // Confirm matches
      const confirmOk = !!(confirmPass && confirmPass === newPass);
      show("err-pass-confirm", !confirmOk);
      if (!confirmOk) ok = false;

      // Nếu Auth.changePassword cần mật khẩu hiện tại (3 tham số) thì bắt buộc có currentPass
      const needsCurrent = !!(window.Auth && typeof Auth.changePassword === "function" && Auth.changePassword.length >= 3);
      if (needsCurrent) {
        const hasCurrent = !!currentPass;
        show("err-pass-current", !hasCurrent);
        if (!hasCurrent) ok = false;
      } else {
        // Nếu không cần currentPass (API 2 tham số), ẩn lỗi (nếu có)
        show("err-pass-current", false);
      }
    } else {
      // Không đổi mật khẩu: ẩn mọi lỗi pass
      show("err-pass", false);
      show("err-pass-confirm", false);
      show("err-pass-current", false);
    }

    if (!ok) return;

    const me = (window.Auth && Auth.me && Auth.me()) || null;
    if (!me) {
      toast("Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.", "error");
      return;
    }

    try {
      // --- Cập nhật users[] ---
      const users = JSON.parse(localStorage.getItem("users") || "[]");
      const idx = users.findIndex((u) => u.id === me.id);
      if (idx > -1) {
        // Check trùng email
        const emailTaken = users.some((u, i) => i !== idx && u.email === email);
        if (emailTaken) {
          toast("Email đã được sử dụng bởi tài khoản khác.", "error");
          return;
        }
        users[idx].name = name;
        users[idx].email = email;
        localStorage.setItem("users", JSON.stringify(users));
      }

      // --- Update currentUser ---
      localStorage.setItem("currentUser", JSON.stringify({ id: me.id, name, email }));

      // --- Update phone ---
      localStorage.setItem("gm_user_phone", phone);

      // --- Đổi mật khẩu (nếu có yêu cầu) ---
      if (wantsChangePass) {
        if (!window.Auth || typeof Auth.changePassword !== "function") {
          toast("Chức năng đổi mật khẩu chưa khả dụng.", "error");
        } else {
          const needsCurrent = Auth.changePassword.length >= 3;
          if (needsCurrent) {
            await Auth.changePassword(me.id, currentPass, newPass);
          } else {
            await Auth.changePassword(me.id, newPass);
          }
          // flash để trang sau báo thành công đổi mật khẩu
          sessionStorage.setItem("gm_flash", JSON.stringify({ type: "success", text: "Đổi mật khẩu thành công." }));
        }
      }

      // Lưu thông tin thành công
      toast("Đã lưu thay đổi.", "success");

      // Điều hướng về trang hồ sơ
      setTimeout(() => (location.href = window.appConfig?.profileUrl || '/Profile/Index'), 700);
    } catch (err) {
      console.error(err);
      const msg = err?.message || "Không thể lưu thay đổi. Vui lòng thử lại.";
      toast(msg, "error");
    }
  });
})();
