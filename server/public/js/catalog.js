// =========================
// PULT+ Catalog
// =========================

let allProducts = [];

function safeText(value) {
    return String(value ?? "").replace(/[&<>"\x27]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "\x27": "&#39;" }[char]));
}

function star(n) {
    return "⭐".repeat(n) + "☆".repeat(5 - n);
}

// =========================
// Categories
// =========================

function renderCategories(categories) {

    const root = document.getElementById("categories");

    if (!root) return;

    root.innerHTML = categories.map((c) => `
        <div class="category-card" data-cat="${safeText(c.label)}">
            <div>${safeText(c.icon)}</div>
            <span>${c.label}</span>
        </div>
    `).join("");

    const first = root.querySelector(".category-card");

    if (first) {
        first.classList.add("active");
    }

    root.querySelectorAll(".category-card").forEach((card) => {

        card.addEventListener("click", () => {

            root.querySelectorAll(".category-card")
                .forEach((c) => c.classList.remove("active"));

            card.classList.add("active");

            const category = card.dataset.cat;

            renderProducts(
                allProducts.filter(
                    (product) => product.category === category
                )
            );

        });

    });

}

// =========================
// Products
// =========================

function renderProducts(products) {

    const root = document.getElementById("productList");
    const count = document.getElementById("productCount");

    if (!root) return;

    root.innerHTML = products.map((p) => `

        <div class="product-card">

            <img
                src="${safeText(p.image || (p.images && p.images[0]) || "")}"
                alt="${safeText(p.title)}"
            >

            <div class="product-body">

                <h3>
                    ${p.title}
                </h3>

                <p>
                    ${safeText(p.description || "")}
                </p>

                <div class="rating">
                    ${star(p.rating || 0)}
                </div>

                <div class="price">
                    ${safeText(p.price)}₴
                </div>

                <button
                    type="button"
                    class="buy-product-btn"
                    data-id="${safeText(p.id)}"
                    ${p.stock <= 0 ? "disabled aria-disabled=\"true\"" : ""}>

                    ${p.stock <= 0 ? "Немає в наявності" : "Купити"}

                </button>

            </div>

        </div>

    `).join("");

    if (count) {
        count.textContent = `${products.length} товарів`;
    }

    // Замість зламаних фото показуємо нейтральну заглушку.
    root.querySelectorAll(".product-card img").forEach(img => {
        img.addEventListener("error", () => {
            img.style.display = "none";
            const placeholder = document.createElement("div");
            placeholder.className = "product-image-placeholder";
            placeholder.textContent = "📦 Фото незабаром";
            img.parentNode.insertBefore(placeholder, img);
        }, { once: true });
        if (!img.getAttribute("src") || (img.complete && img.naturalWidth === 0)) {
            img.dispatchEvent(new Event("error"));
        }
    });

    // =========================
    // BUY BUTTON
    // =========================

    root.querySelectorAll(".buy-product-btn").forEach((button) => {

        button.addEventListener("click", (event) => {

            event.preventDefault();
            event.stopPropagation();

            const id = button.dataset.id;

            const product = allProducts.find(
                (p) => p.id === id
            );

            if (!product) {
                console.error("Товар не знайдено:", id);
                return;
            }

            if (product.stock <= 0) return;

            const image =
                product.image ||
                (product.images && product.images[0]) ||
                "";

            addToCart({
                id: product.id,
                title: product.title,
                price: Number(product.price),
                image: image
            });

            button.textContent = "✓ Додано";
            button.disabled = true;
            button.style.opacity = "0.8";

        });

    });

}

// =========================
// Load JSON
// =========================

async function loadCatalog() {

    try {

        // Категорії та їх іконки поки залишаються в старому JSON.
        // Товари, ціни й залишки тепер надходять тільки з PostgreSQL.
        const [productsResponse, categoriesResponse] = await Promise.all([
            fetch("/api/products"),
            fetch("data/pults.json")
        ]);

        if (!productsResponse.ok || !categoriesResponse.ok) {
            throw new Error("Не вдалося завантажити каталог");
        }

        const productsData = await productsResponse.json();
        const categoriesData = await categoriesResponse.json();

        allProducts = (productsData.products || []).map((product) => ({
            id: product.sku,
            databaseId: product.id,
            title: product.name,
            brand: product.brand,
            description: product.description || "",
            price: Number(product.price),
            oldPrice: product.old_price == null ? null : Number(product.old_price),
            rating: Number(product.rating) || 0,
            stock: Number(product.stock),
            category: product.category || "tv",
            image: product.image_url || "",
            features: product.features || [],
            compatible: product.compatible || []
        }));

        renderCategories(
            categoriesData.categories || []
        );

        renderProducts(
            allProducts
        );

        initSearch();

    } catch (error) {

        console.error(
            "Не вдалося завантажити каталог:",
            error
        );

    }

}

// =========================
// Search
// =========================

function initSearch() {

    const input =
        document.querySelector(".search-box input");

    if (!input) return;

    input.addEventListener("input", () => {

        const query =
            input.value.toLowerCase().trim();

        const filtered =
            allProducts.filter((product) => {

                return (
                    product.title
                        .toLowerCase()
                        .includes(query)

                    ||

                    (product.description || "")
                        .toLowerCase()
                        .includes(query)
                );

            });

        renderProducts(filtered);

    });

}

// =========================
// Start
// =========================

document.addEventListener(
    "DOMContentLoaded",
    loadCatalog
);