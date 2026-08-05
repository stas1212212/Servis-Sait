// =========================
// Render catalog from JSON
// =========================

let allProducts = [];

function star(n) {
    return "⭐".repeat(n) + "☆".repeat(5 - n);
}

function renderCategories(categories) {
    const root = document.getElementById("categories");
    if (!root) return;

    root.innerHTML = categories.map((c, i) => `
        <div class="category-card" data-cat="${c.label}">
            <div>${c.icon}</div>
            <span>${c.label}</span>
        </div>
    `).join("");

    // Активуємо першу категорію за замовчуванням
    root.querySelector(".category-card")?.classList.add("active");

    // Click handler (відновлюємо після innerHTML)
    root.querySelectorAll(".category-card").forEach((card) => {
        card.addEventListener("click", () => {
            root.querySelectorAll(".category-card").forEach((c) => c.classList.remove("active"));
            card.classList.add("active");
            const cat = card.dataset.cat;
            renderProducts(allProducts.filter((p) => p.category === cat));
        });
    });
}

function renderProducts(products) {
    const root = document.getElementById("productList");
    const count = document.getElementById("productCount");
    if (!root) return;

    root.innerHTML = products.map((p) => `
        <div class="product-card">
            <img src="${p.image}" alt="${p.title}">
            <div class="product-body">
                <h3>${p.title}</h3>
                <p>${p.description}</p>
                <div class="rating">${star(p.rating)}</div>
                <div class="price">${p.price}₴</div>
                <button data-id="${p.id}">Купити</button>
            </div>
        </div>
    `).join("");

    if (count) count.textContent = `${products.length} товарів`;

    // Click handler для "Купити"
    // Click handler для переходу на товар
root.querySelectorAll(".product-card button").forEach((btn) => {

    btn.addEventListener("click", () => {

        const id = btn.dataset.id;

        window.location.href = `product.html?id=${id}`;

    });

});

}

function loadCatalog() {
    fetch("data/pults.json")
        .then((r) => {
            if (!r.ok) throw new Error("HTTP " + r.status);
            return r.json();
        })
        .then((data) => {
            allProducts = data.products || [];
            renderCategories(data.categories || []);
            renderProducts(allProducts);
            initSearch();
        })
        .catch((err) => {
            console.error("Не вдалося завантажити products.json:", err);
        });
}

function initSearch() {
    const input = document.querySelector(".search-box input");
    if (!input) return;
    input.addEventListener("input", () => {
        const q = input.value.toLowerCase().trim();
        renderProducts(allProducts.filter((p) =>
            p.title.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q)
        ));
    });
}

document.addEventListener("DOMContentLoaded", loadCatalog);
