// === Hàm cardHTML giữ nguyên như bạn đưa ===
function cardHTML(p) {
    const pid = p.Id || p.id || p._id || p.link || p.Title || p.title;
    const href = `/Home/ProductDetail?id=${encodeURIComponent(pid)}`;

    // Chuẩn hóa tags: SQL trả về chuỗi => tách mảng
    const tagsArray = p.Tags
        ? String(p.Tags).split(",").map(t => t.trim()).filter(Boolean)
        : (p.tags || []);

    return `
<div class="slidezy-item">
  <article class="product-card"
    data-id="${pid}"
    data-name="${p.Title || p.title}"
    data-price="${p.Price || p.price}"
    data-img="${p.Image || p.image}">
    <div class="product-card__img-wrap">
      <a href="${href}">
        <img src="${p.Image || p.image}" alt class="product-card__thumb">
      </a>
    </div>
    <h3 class="product-card__title">
      <a href="${href}">${p.Title || p.title}</a>
    </h3>

    <div class="product-card__tag">
      ${tagsArray.map(tag => `<p>${tag}</p>`).join('')}
    </div>

    <p class="product-card__price">${p.Price || p.price}</p>
    <div class="product-card__list-old">
      <p class="product-card__price-old">${p.OldPrice || p.oldPrice || ""}</p>
      <p class="percent">${p.Discount || p.discount || ""}</p>
    </div>

    <div class="product-card__row">
      <img src="${window.appConfig?.contentPath || '/Content'}/icons/star.svg" alt class="product-card__star">
      <span class="product-card__score">${p.Score || p.score || ""}</span>
      <p class="vote-txt">• Đã bán ${p.Sold || p.sold || ""}</p>
    </div>

    <button class="btn-add-cart" data-add-to-cart>Thêm vào giỏ</button>
  </article>
</div>`;
}

// === Hàm gọi SQL và render ra HTML ===
async function loadAndRenderProducts() {
    try {
        const res = await fetch("/Home/GetProducts", { cache: "no-store" });
        if (!res.ok) throw new Error("HTTP " + res.status);
        const data = await res.json(); // list product từ SQL

        // Tùy bạn: có thể lọc, sort,… ở đây
        // Ví dụ: lấy 10 sản phẩm đầu
        const products = data.slice(0, 10);

        const container = document.getElementById("similar-grid");
        if (!container) {
            console.warn("Không tìm thấy #similar-grid");
            return;
        }

        container.innerHTML = products.map(cardHTML).join("");

    } catch (err) {
        console.error("Lỗi load products từ SQL:", err);
    }
}

// Gọi sau khi DOM sẵn sàng
document.addEventListener("DOMContentLoaded", loadAndRenderProducts);
