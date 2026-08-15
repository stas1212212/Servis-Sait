// =========================
// PULT+ Catalog
// =========================

let allProducts = [];

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
        <div class="category-card" data-cat="${c.label}">
            <div>${c.icon}</div>
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
                src="${p.image || (p.images && p.images[0]) || ""}"
                alt="${p.title}"
            >

            <div class="product-body">

                <h3>
                    ${p.title}
                </h3>

                <p>
                    ${p.description || ""}
                </p>

                <div class="rating">
                    ${star(p.rating || 0)}
                </div>

                <div class="price">
                    ${p.price}₴
                </div>

                <button
                    type="button"
                    class="buy-product-btn"
                    data-id="${p.id}">

                    Купити

                </button>

            </div>

        </div>

    `).join("");

    if (count) {
        count.textContent = `${products.length} товарів`;
    }

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

        const response =
            await fetch("data/pults.json");

        if (!response.ok) {
            throw new Error(
                "HTTP " + response.status
            );
        }

        const data =
            await response.json();

        allProducts =
            data.products || [];

        renderCategories(
            data.categories || []
        );

        renderProducts(
            allProducts
        );

        initSearch();

    } catch (error) {

        console.error(
            "Не вдалося завантажити pults.json:",
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