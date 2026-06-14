(() => {
  const USERS_KEY = "users";
  const CURRENT_USER_KEY = "currentUser";

  // ---------- helpers ----------
  const $ = (s, r = document) => r.querySelector(s);
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const enc = new TextEncoder();

  // Safe closest helper - ensures closest exists before calling
  const safeClosest = (element, selector) => {
    if (!element || typeof element.closest !== 'function') return null;
    try {
      return element.closest(selector);
    } catch (e) {
      return null;
    }
  };

  // Safe target getter - ensures we get a valid Element
  const getSafeTarget = (event) => {
    if (!event || !event.target) return null;
    let target = event.target;
    if (target instanceof Element) return target;
    if (target?.parentElement instanceof Element) return target.parentElement;
    return null;
  };

  const toast = (msg, type = "info", ms = 2000) => {
    const el = document.createElement("div");
    el.className = `toast toast--${type}`;
    Object.assign(el.style, {
      position: "fixed", top: "12px", right: "12px",
      background: type === "error" ? "#ef4444" : type === "success" ? "#22c55e" : "#2563eb",
      color: "#fff", padding: "10px 12px", borderRadius: "10px", zIndex: 9999, boxShadow: "0 6px 20px rgba(0,0,0,.15)"
    });
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), ms);
  };

  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));

  async function sha256Hex(data) {
    const buf = await crypto.subtle.digest("SHA-256", data);
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
  }

  async function hashPassword(password, saltHex) {
    const salt = saltHex || [...crypto.getRandomValues(new Uint8Array(16))].map(b => b.toString(16).padStart(2, "0")).join("");
    const data = enc.encode(password + ":" + salt);
    const hex = await sha256Hex(data);
    return `${salt}:${hex}`; // store "salt:hash"
  }

  async function verifyPassword(password, stored) {
    const [salt, hash] = String(stored || "").split(":");
    if (!salt || !hash) return false;
    const tryHash = await hashPassword(password, salt);
    return tryHash.split(":")[1] === hash;
  }

  function loadUsers() {
    try { return JSON.parse(localStorage.getItem(USERS_KEY) || "[]"); } catch { return []; }
  }
  function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }
  function getCurrentUser() {
    try { return JSON.parse(localStorage.getItem(CURRENT_USER_KEY) || "null"); } catch { return null; }
  }
  function setCurrentUser(user) {
    if (user) localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(CURRENT_USER_KEY);
  }

  // === NEW: lấy avatar từ localStorage (users[idx].avatar hoặc gm_avatar_<id>) ===
  function getUserAvatar(me) {
    const fallback = `${window.appConfig?.contentPath || '/Content'}/img/avatar/avatar-3.png`;
    if (!me) return fallback;
    try {
      const users = JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
      const u = users.find((x) => x.id === me.id);
      const fromKey = localStorage.getItem(`gm_avatar_${me.id}`);
      return (u && u.avatar) || fromKey || fallback;
    } catch {
      return fallback;
    }
  }

  const Auth = {
    setCurrentUser: setCurrentUser, // Expose để có thể gọi từ bên ngoài
    
    async signUp({ name = "", email = "", password = "" }) {
      email = String(email || "").trim().toLowerCase();
      if (!emailRe.test(email)) throw new Error("Email không hợp lệ");
      if ((password || "").length < 6) throw new Error("Mật khẩu tối thiểu 6 ký tự");

      const users = loadUsers();
      if (users.some(u => u.email === email)) throw new Error("Email đã tồn tại");

      const passwordHash = await hashPassword(password);
      const user = { id: uid(), name: name.trim(), email, passwordHash, createdAt: new Date().toISOString() };
      users.push(user); saveUsers(users);

      const current = { id: user.id, name: user.name, email: user.email };
      setCurrentUser(current);
      return current;
    },

    async changePassword(userId, currentPassword, newPassword) {
      if (!newPassword || newPassword.length < 6) {
        throw new Error("Mật khẩu mới tối thiểu 6 ký tự");
      }
      const users = loadUsers();
      const idx = users.findIndex(u => u.id === userId);
      if (idx === -1) throw new Error("Không tìm thấy người dùng");

      const ok = await verifyPassword(currentPassword || "", users[idx].passwordHash || "");
      if (!ok) throw new Error("Mật khẩu hiện tại không đúng");

      const passwordHash = await hashPassword(newPassword);
      users[idx].passwordHash = passwordHash;
      saveUsers(users);
      return true;
    },

    async signIn({ email = "", password = "" }) {
      email = String(email || "").trim().toLowerCase();
      const users = loadUsers();
      const user = users.find(u => u.email === email);
      if (!user || !(await verifyPassword(password, user.passwordHash))) {
        throw new Error("Email hoặc mật khẩu không đúng");
      }
      const current = { id: user.id, name: user.name, email: user.email };
      setCurrentUser(current);
      return current;
    },

    signOut() { setCurrentUser(null); },
    me() { return getCurrentUser(); },
    getCurrentUser() { return getCurrentUser(); }, // Expose getCurrentUser
    syncCartFromServer() { syncCartFromServer(); }, // Expose để gọi từ bên ngoài

    // Bảo vệ trang: nếu chưa login thì chuyển hướng
    requireAuth(redirectTo = null) {
      if (!getCurrentUser()) {
        if (!redirectTo) {
          redirectTo = window.appConfig?.loginUrl || '/Account/Login';
        }
        location.href = redirectTo;
      }
    }
  };
  window.Auth = Auth;
  
  // Expose renderAuthSlot để có thể gọi từ bên ngoài
  window.Auth.renderAuthSlot = renderAuthSlot;

  // ---------- wire forms if present ----------
  // Chỉ wire form nếu chưa có handler riêng (kiểm tra bằng data attribute hoặc event listener)
  const signUpForm = $("#sign-up-form");
  if (signUpForm && !signUpForm.dataset?.hasHandler) {
    signUpForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = $("#sign-up-name")?.value ?? "";
      const email = $("#sign-up-email")?.value ?? "";
      const password = $("#sign-up-password")?.value ?? "";
      const confirm = $("#sign-up-confirm")?.value ?? "";
      
      if (password !== confirm) {
        toast("Mật khẩu nhập lại không khớp", "error");
        return;
      }
      
      try {
        // Gọi API backend để đăng ký
        const token = document.querySelector('input[name="__RequestVerificationToken"]')?.value;
        if (!token) {
          toast("Lỗi: Không tìm thấy token xác thực", "error");
          return;
        }

        const formData = new URLSearchParams();
        formData.append('name', name);
        formData.append('email', email);
        formData.append('password', password);
        formData.append('confirmPassword', confirm);
        formData.append('__RequestVerificationToken', token);

        const res = await fetch('/Account/Register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData.toString()
        });

        const data = await res.json();
        
        if (data.success) {
          // Lưu vào localStorage để đồng bộ
          const userInfo = await fetch('/Account/GetCurrentUser').then(r => r.json());
          if (userInfo.success && userInfo.user) {
            setCurrentUser({
              id: userInfo.user.id,
              name: userInfo.user.name,
              email: userInfo.user.email,
              role: userInfo.user.role || 0
            });
          }
          
          toast("Đăng ký thành công!", "success");
          const redirectUrl = data.redirectUrl || window.appConfig?.homeUrl || '/Home/Index';
          location.href = redirectUrl;
        } else {
          toast(data.message || "Lỗi đăng ký", "error");
        }
      } catch (err) {
        console.error('[auth] Lỗi đăng ký:', err);
        toast(err.message || "Lỗi đăng ký", "error");
      }
    });
  }

  const signInForm = $("#sign-in-form");
  if (signInForm && !signInForm.dataset?.hasHandler) {
    signInForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = $("#sign-in-email")?.value ?? "";
      const password = $("#sign-in-password")?.value ?? "";
      try {
        await Auth.signIn({ email, password });
        toast("Đăng nhập thành công!", "success");
        const homeUrl = window.appConfig?.homeUrl || '/Home/Index';
        location.href = homeUrl;
      } catch (err) { toast(err.message || "Lỗi đăng nhập", "error"); }
    });
  }

  // ---------- header auth mini-UI ----------
  async function renderAuthSlot() {
    const slot = document.querySelector("[data-auth-slot]");
    if (!slot) return;
    const me = Auth.me();

    // Lấy URLs từ appConfig hoặc dùng giá trị mặc định
    const contentPath = (window.appConfig && window.appConfig.contentPath) || '/Content';
    let profileUrl = '/Profile/Index'; // Giá trị mặc định - LUÔN dùng giá trị này
    if (window.appConfig && window.appConfig.profileUrl) {
      const configUrl = window.appConfig.profileUrl;
      // Đảm bảo không dùng profile.html
      if (configUrl && !configUrl.includes('profile.html')) {
        profileUrl = configUrl;
      }
    }
    // Debug: log để kiểm tra
    console.log('[auth] profileUrl:', profileUrl, 'appConfig.profileUrl:', window.appConfig?.profileUrl);
    
    const loginUrl = (window.appConfig && window.appConfig.loginUrl) || '/Account/Login';
    const registerUrl = (window.appConfig && window.appConfig.registerUrl) || '/Account/Register';

    if (me) {
      const avatar = getUserAvatar(me);
      // Khi đã login: render avatar + dropdown (dùng avatar lấy từ localStorage)
      slot.innerHTML = `
        <div class="top-act__user">
          <img src="${avatar}" alt="" class="top-act__avatar" style="cursor:pointer" />

          <!-- Dropdown -->
          <div class="act-dropdown top-act__dropdown">
            <div class="act-dropdown__inner user-menu">

              <div class="user-menu__top">
                <img src="${avatar}" alt="" class="user-menu__avatar" />
                <div>
                  <p class="user-menu__name">${me.name || me.email}</p>
                  <p>@${me.email.split("@")[0]}</p>
                </div>
              </div>

              <ul class="user-menu__list">
                <li><a href="${profileUrl}" class="user-menu__link" data-profile-link>Thông Tin Cá Nhân</a></li>
                ${(me.role >= 50) ? `<li><a href="/Admin/Dashboard" class="user-menu__link">Trang Quản Trị</a></li>` : ''}
                <li class="user-menu__separate">
                  <a href="#!" class="user-menu__link" id="switch-theme-btn">
                    <span>Dark mode</span>
                    <img src="${contentPath}/icons/sun.svg" alt="" class="icon user-menu__icon" />
                  </a>
                </li>
                <li><a href="#!" class="user-menu__link">Cài Đặt</a></li>
                <li class="user-menu__separate">
                  <a href="#!" class="user-menu__link" data-logout>Đăng Xuất</a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      `;
    } else {
      slot.innerHTML = `
        <a href="${loginUrl}" class="btn btn--text d-md-none">Đăng Nhập</a>
        <a href="${registerUrl}" class="top-act__sign-up btn btn--primary">Đăng Ký</a>
      `;
    }
  }


  // Attach dark mode button handler
  function attachDarkModeHandler() {
    const switchBtn = document.querySelector("#switch-theme-btn");
    if (switchBtn && !switchBtn.dataset.handlerAttached) {
      switchBtn.dataset.handlerAttached = 'true';
      switchBtn.onclick = function () {
        const isDark = localStorage.dark === "true";
        document.querySelector("html").classList.toggle("dark", !isDark);
        localStorage.setItem("dark", !isDark);
        const span = switchBtn.querySelector("span");
        if (span) {
          span.textContent = isDark ? "Dark mode" : "Light mode";
        }
      };
      // Set initial text
      const isDark = localStorage.dark === "true";
      const span = switchBtn.querySelector("span");
      if (span) {
        span.textContent = isDark ? "Light mode" : "Dark mode";
      }
    }
  }

  // Render ngay từ localStorage (không chờ server)
  // Đảm bảo render lại sau khi appConfig được định nghĩa
  function ensureRender() {
    renderAuthSlot();
    document.dispatchEvent(new Event('auth-slot-updated'));
    // Attach dark mode handler after rendering
    setTimeout(() => {
      attachDarkModeHandler();
      // alignProfileArrow(); // Đã tắt
    }, 50);
  }
  
  // Re-attach dark mode handler when auth slot is updated
  document.addEventListener('auth-slot-updated', () => {
    setTimeout(() => {
      attachDarkModeHandler();
    }, 50);
  });

  // Render ngay
  ensureRender();
  
  // Render lại sau khi appConfig được định nghĩa
  document.addEventListener('app-config-ready', () => {
    console.log('[auth] app-config-ready event fired, re-rendering...');
    ensureRender();
  });
  
  // Render lại sau khi DOM ready (nếu appConfig đã có)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => {
        console.log('[auth] DOMContentLoaded, re-rendering...');
        ensureRender();
      }, 100);
    });
  } else {
    setTimeout(() => {
      console.log('[auth] Document already ready, re-rendering...');
      ensureRender();
    }, 100);
  }
  
  // Đảm bảo link không bị override bởi code khác - intercept click và redirect nếu cần
  document.addEventListener('click', (e) => {
    try {
      // Use safe target getter
      const target = getSafeTarget(e);
      if (!target) return;
      
      const profileLink = safeClosest(target, '[data-profile-link]') || safeClosest(target, 'a.user-menu__link');
      if (profileLink) {
        const href = profileLink.getAttribute('href');
        console.log('[auth] Profile link clicked, href:', href);
        // Nếu href là profile.html hoặc bất kỳ link nào chứa profile.html, redirect
        if (href && (href.includes('profile.html') || href === 'profile.html' || href.endsWith('/profile.html'))) {
          e.preventDefault();
          e.stopPropagation();
          const correctUrl = '/Profile/Index'; // Luôn dùng URL đúng
          console.log('[auth] Blocking profile.html, redirecting to:', correctUrl);
          window.location.href = correctUrl;
          return false;
        }
      }
    } catch (err) {
      // Silently fail
      console.debug('[auth] click handler error:', err);
    }
  }, true); // Use capture phase để intercept sớm
  
  // Đảm bảo tất cả link profile.html được fix ngay khi render
  function fixProfileLinks() {
    const links = document.querySelectorAll('a[href*="profile.html"], a.user-menu__link');
    links.forEach(link => {
      const href = link.getAttribute('href');
      if (href && (href.includes('profile.html') || href === 'profile.html' || href.endsWith('/profile.html'))) {
        console.log('[auth] Fixing profile link:', href, '-> /Profile/Index');
        link.setAttribute('href', '/Profile/Index');
        link.setAttribute('data-profile-link', '');
      }
    });
  }
  
  // Fix links ngay sau khi render
  setTimeout(fixProfileLinks, 50);
  document.addEventListener('app-config-ready', () => {
    setTimeout(fixProfileLinks, 50);
  });
  document.addEventListener('auth-slot-updated', () => {
    setTimeout(fixProfileLinks, 50);
  });

  // Sync với server Session khi load trang (chạy ngầm, không block UI)
  async function syncSessionWithServer() {
    try {
      const res = await fetch('/Account/GetCurrentUser', { 
        cache: 'no-cache',
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (!res.ok) {
        // Nếu không có Session, clear localStorage nếu cần
        const localUser = getCurrentUser();
        if (localUser) {
          setCurrentUser(null);
          renderAuthSlot();
          document.dispatchEvent(new Event('auth-slot-updated'));
        }
        return;
      }
      const data = await res.json();
      if (data.success && data.authenticated && data.user) {
        // Nếu server có Session, sync với localStorage
        const current = {
          id: data.user.id,
          name: data.user.name,
          email: data.user.email,
          role: data.user.role || 0
        };
        const localUser = getCurrentUser();
        // Chỉ update nếu khác nhau để tránh re-render không cần thiết
        if (!localUser || localUser.id !== current.id || localUser.email !== current.email || localUser.role !== current.role) {
          setCurrentUser(current);
          renderAuthSlot();
          document.dispatchEvent(new Event('auth-slot-updated'));
          // Load cart từ SQL khi đăng nhập (chạy ngay, không delay) và render ngay
          syncCartFromServer();
          // Đảm bảo render cart ngay lập tức
          setTimeout(() => {
            if (window.renderMiniCart) {
              window.renderMiniCart();
            }
          }, 50);
        }
      } else {
        // Nếu server không có Session, clear localStorage
        const localUser = getCurrentUser();
        if (localUser) {
          setCurrentUser(null);
          renderAuthSlot();
          document.dispatchEvent(new Event('auth-slot-updated'));
          // Render cart từ localStorage khi đăng xuất (chạy ngay)
          clearCartSync();
        }
      }
    } catch (e) {
      console.warn('[auth] Không sync được với server:', e);
      // Nếu không sync được, giữ nguyên localStorage (đã render rồi)
    }
  }

  // Sync khi load trang (chạy ngầm, không block)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      // Render ngay từ localStorage
      renderAuthSlot();
      // Sync với server sau (không block)
      setTimeout(syncSessionWithServer, 100);
    });
  } else {
    // Render ngay từ localStorage
    renderAuthSlot();
    // Sync với server sau (không block)
    setTimeout(syncSessionWithServer, 100);
  }

  // Đăng xuất
  document.addEventListener("click", async (e) => {
    const path = e.composedPath ? e.composedPath() : [];
    const btn = path.find(n => n instanceof Element && n.matches?.("[data-logout]"));
    if (!btn) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    try {
      // Gọi API backend để đăng xuất (clear Session)
      const token = document.querySelector('input[name="__RequestVerificationToken"]')?.value;
      if (token) {
        try {
          await fetch('/Account/Logout', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `__RequestVerificationToken=${encodeURIComponent(token)}`
          });
        } catch (err) {
          console.warn('[auth] Lỗi gọi API logout:', err);
        }
      }
    } catch (e) {
      console.warn('[auth] Lỗi đăng xuất:', e);
    }
    
    // Export cart từ SQL về localStorage và XÓA khỏi SQL khi đăng xuất
    try {
      const currentUser = getCurrentUser();
      if (currentUser && currentUser.id) {
        // Load cart từ SQL và lưu vào localStorage
        const response = await fetch('/Cart/GetCart', {
          cache: 'no-cache',
          headers: { 'Cache-Control': 'no-cache' }
        });
        if (response.ok) {
          const data = await response.json();
          if (data.success && Array.isArray(data.items) && data.items.length > 0) {
            // Lưu cart từ SQL vào localStorage
            if (window.cartStore?.set) {
              window.cartStore.set(data.items);
              console.log('[cart-sync] Đã export', data.items.length, 'items từ SQL về localStorage');
            }
          }
        }
        
        // XÓA TẤT CẢ cart khỏi SQL sau khi export (đảm bảo xóa hết)
        const token = document.querySelector('input[name="__RequestVerificationToken"]')?.value;
        if (token) {
          try {
            console.log('[cart-sync] Đang xóa tất cả cart khỏi SQL...');
            const clearResponse = await fetch('/Cart/ClearCart', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: `__RequestVerificationToken=${encodeURIComponent(token)}`
            });
            if (clearResponse.ok) {
              const clearResult = await clearResponse.json();
              if (clearResult.success) {
                console.log('[cart-sync] Đã xóa TẤT CẢ cart khỏi SQL sau khi export');
              } else {
                console.warn('[cart-sync] Lỗi xóa cart khỏi SQL:', clearResult.message);
              }
            } else {
              console.warn('[cart-sync] API ClearCart trả về lỗi:', clearResponse.status);
            }
          } catch (clearErr) {
            console.error('[cart-sync] Lỗi xóa cart khỏi SQL:', clearErr);
          }
        } else {
          console.warn('[cart-sync] Không có AntiForgeryToken để xóa cart');
        }
      }
    } catch (e) {
      console.error('[cart-sync] Lỗi export cart:', e);
    }
    
    // Clear localStorage user
    Auth?.signOut?.();
    
    // Render lại UI
    renderAuthSlot();
    document.dispatchEvent(new Event('auth-slot-updated'));
    
    // Render cart từ localStorage NGAY LẬP TỨC
    clearCartSync();
    
    // Redirect về trang chủ hoặc login
    const homeUrl = window.appConfig?.homeUrl || '/Home/Index';
    location.href = homeUrl;
  });

  document.addEventListener("avatar-updated", () => {
    renderAuthSlot();
    // alignProfileArrow(); // Đã tắt
  });

  window.addEventListener("storage", (e) => {
    if (e.key && (e.key.startsWith("gm_avatar_") || e.key === USERS_KEY)) {
      renderAuthSlot();
      // alignProfileArrow(); // Đã tắt
    }
  });

  // Căn chỉnh mũi tên khi hover vào user menu - ĐÃ TẮT
  // document.addEventListener('pointerenter', ...);

  // Căn chỉnh lại khi resize - ĐÃ TẮT
  // window.addEventListener('resize', ...);

  // Căn chỉnh khi dropdown được hiển thị - ĐÃ TẮT
  // document.addEventListener('auth-slot-updated', ...);

  // ========== Cart Sync Functions ==========
  
  // Load cart từ SQL và merge với localStorage
  async function syncCartFromServer() {
    try {
      const currentUser = getCurrentUser();
      if (!currentUser || !currentUser.id) {
        return; // Chưa đăng nhập, không sync
      }

      console.log('[cart-sync] Đang load cart từ SQL...');
      const response = await fetch('/Cart/GetCart', {
        cache: 'no-cache',
        headers: { 'Cache-Control': 'no-cache' }
      });

      if (!response.ok) {
        console.warn('[cart-sync] Không load được cart từ server');
        return;
      }

      const data = await response.json();
      if (data.success && Array.isArray(data.items)) {
        // Khi đăng nhập: CHỈ dùng cart từ SQL, KHÔNG merge với localStorage
        const serverCart = data.items;
        
        // Update localStorage với cart từ SQL (thay thế hoàn toàn)
        if (window.cartStore?.set) {
          window.cartStore.set(serverCart);
          console.log('[cart-sync] Đã load', serverCart.length, 'items từ SQL (thay thế localStorage)');
        }
        
        // Re-render cart NGAY LẬP TỨC (render ngay, không chờ)
        if (window.renderMiniCart) {
          window.renderMiniCart();
          console.log('[cart-sync] Đã render cart từ SQL ngay lập tức');
        }
      } else {
        console.log('[cart-sync] Server cart trống, clear localStorage');
        // Clear localStorage nếu server cart trống
        if (window.cartStore?.set) {
          window.cartStore.set([]);
        }
        if (window.renderMiniCart) {
          window.renderMiniCart();
        }
      }
    } catch (e) {
      console.warn('[cart-sync] Lỗi sync cart từ server:', e);
      // Nếu lỗi, vẫn render từ localStorage
      if (window.renderMiniCart) {
        window.renderMiniCart();
      }
    }
  }

  // Clear cart sync khi đăng xuất (chỉ clear flag, giữ localStorage)
  function clearCartSync() {
    // Re-render từ localStorage NGAY LẬP TỨC
    if (window.renderMiniCart) {
      window.renderMiniCart();
      console.log('[cart-sync] Đã render cart từ localStorage (đăng xuất)');
    }
  }

  // Listen event khi user đăng nhập thành công (từ Login/Register page)
  document.addEventListener('auth-slot-updated', () => {
    const currentUser = getCurrentUser();
    if (currentUser && currentUser.id) {
      // User vừa đăng nhập, sync cart từ server NGAY LẬP TỨC (không delay)
      syncCartFromServer();
      // Đảm bảo render cart ngay lập tức
      setTimeout(() => {
        if (window.renderMiniCart) {
          window.renderMiniCart();
          console.log('[cart-sync] Đã render cart sau khi đăng nhập');
        }
      }, 100);
    }
  });
})();
