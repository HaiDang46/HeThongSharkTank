
if (window.Auth && typeof Auth.requireAuth === "function") {
    Auth.requireAuth(); // Sử dụng default từ appConfig
}

const toast = (msg, type = "info", ms = 2000) => {
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
};

document.getElementById("change-pass-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const current = document.getElementById("password-current")?.value || "";
    const next = document.getElementById("password-new")?.value || "";
    const confirm = document.getElementById("password-confirm")?.value || "";

    // Validate
    let ok = true;
    const show = (id, s) => { const el = document.getElementById(id); if (el) el.style.display = s ? "" : "none"; };

    show("err-pass-current", !current);
    if (!current) ok = false;

    show("err-pass-new", !(next && next.length >= 6));
    if (!(next && next.length >= 6)) ok = false;

    show("err-pass-confirm", !(confirm && confirm === next));
    if (!(confirm && confirm === next)) ok = false;

    if (!ok) return;

    const me = Auth?.me?.();
    if (!me) {
        toast("Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.", "error");
        return;
    }

    try {
        if (!Auth.changePassword) {
            toast("Chức năng đổi mật khẩu chưa khả dụng.", "error");
            return;
        }
        await Auth.changePassword(me.id, current, next);

        sessionStorage.setItem(
            "gm_flash",
            JSON.stringify({ type: "success", text: "Đổi mật khẩu thành công." })
        );

        const profileUrl = window.appConfig?.profileUrl || '/Profile/Index';
        location.href = profileUrl;
    } catch (err) {
        console.error(err);
        const msg = (err && err.message) || "Không thể đổi mật khẩu. Vui lòng thử lại.";
        toast(msg, "error");
    }
});
