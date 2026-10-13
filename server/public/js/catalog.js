// =========================
// PULT+ Catalog
// =========================

let allProducts = [];

function safeText(value) {
    return String(value ?? "").replace(/[&<>"\x27]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "\x27": "&#39;" }[char]));
}

function star(n) {
    const rating = Math.max(0, Math.min(5, Number(n) || 0));
    return "⭐".repeat(Math.floor(rating)) + "☆".repeat(5 - Math.floor(rating));
}

// =========================
// Categories
// =========================

let activeCategory = "";
function renderCategories(categories) {
    const root = document.getElementById("categories");
    if (!root) return;
    const items = [{id:"",icon:"🔎",label:"Усі пульти"},...categories];
    root.innerHTML = items.map(c => '<button type="button" class="category-card" data-cat="' + safeText(c.id) + '"><span>' + safeText(c.icon) + '</span><span>' + safeText(c.label) + '</span></button>').join("");
    root.querySelectorAll(".category-card").forEach(card => {
        card.classList.toggle("active",card.dataset.cat === activeCategory);
        card.addEventListener("click", () => {
            activeCategory = card.dataset.cat;
            const categoryControl=document.getElementById("catalogCategory");
            if(categoryControl)categoryControl.value=activeCategory;
            applyCatalogFilters();
        });
    });
    const categoryControl=document.getElementById("catalogCategory");
    if(categoryControl) {
        categoryControl.replaceChildren(new Option("Усі категорії",""));
        categories.forEach(c=>categoryControl.add(new Option(c.label,c.id)));
    }
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
                    ${safeText(p.title)}
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
            model: product.model || "",
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

function applyCatalogFilters() {
    const query=(document.getElementById("catalogQuery")?.value||"").trim().toLocaleLowerCase();
    const brand=document.getElementById("catalogBrand")?.value||"";
    const inStock=Boolean(document.getElementById("catalogStock")?.checked);
    const sort=document.getElementById("catalogSort")?.value||"name";
    const category=document.getElementById("catalogCategory")?.value??activeCategory;
    activeCategory=category;
    document.querySelectorAll("#categories .category-card").forEach(card=>card.classList.toggle("active",card.dataset.cat===category));
    const filtered=allProducts.filter(p=>{
      const haystack=[p.title,p.brand,p.model,p.description,...(Array.isArray(p.compatible)?p.compatible:[])].join(" ").toLocaleLowerCase();
      return (!query||haystack.includes(query)) && (!category||p.category===category) &&
             (!brand||p.brand===brand) && (!inStock||p.stock>0);
    });
    filtered.sort((a,b)=>sort==="price_asc"?a.price-b.price:sort==="price_desc"?b.price-a.price:
      sort==="stock"?b.stock-a.stock:String(a.title).localeCompare(String(b.title),"uk"));
    renderProducts(filtered);
}
function initSearch() {
    const brand=document.getElementById("catalogBrand");
    if(brand){
      const brands=[...new Set(allProducts.map(p=>p.brand).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"uk"));
      brand.replaceChildren(new Option("Усі бренди",""));
      brands.forEach(value=>brand.add(new Option(value,value)));
    }
    ["catalogQuery","catalogBrand","catalogCategory","catalogStock","catalogSort"].forEach(id=>{
      const el=document.getElementById(id);
      if(el)el.addEventListener(id==="catalogQuery"?"input":"change",applyCatalogFilters);
    });
    document.getElementById("catalogSearchButton")?.addEventListener("click",applyCatalogFilters);
    applyCatalogFilters();
}

// =========================
// Start
// =========================

document.addEventListener(
    "DOMContentLoaded",
    loadCatalog
);