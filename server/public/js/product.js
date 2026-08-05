// =========================
// Product Page
// =========================

document.addEventListener("DOMContentLoaded", loadProduct);

async function loadProduct() {

    // Отримуємо ID з URL
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");

    if (!id) {
        console.error("ID товару не знайдено");
        return;
    }

    try {

        // Завантажуємо JSON
        const response = await fetch("data/pults.json");
        const data = await response.json();

        // Шукаємо товар
        const product = data.products.find(p => p.id === id);

        if (!product) {
            document.querySelector("main").innerHTML = `
                <section class="pt-40 pb-24 text-center">
                    <h1 class="text-5xl font-black mb-6">
                        Товар не знайдено
                    </h1>

                    <a href="pults-shop.html"
                       class="inline-block mt-6 px-8 py-4 rounded-2xl bg-black text-white">

                        ← Назад до магазину

                    </a>
                </section>
            `;
            return;
        }

        // =========================
        // Basic Info
        // =========================

        document.title = `${product.title} | PULT+`;

        const productBrand = document.getElementById("productBrand");
        if (productBrand) {
            productBrand.textContent = product.brand;
        }

        const productTitle = document.getElementById("productTitle");
        if (productTitle) {
            productTitle.textContent = product.title;
        }

        const productPrice = document.getElementById("productPrice");
        if (productPrice) {
            productPrice.textContent = `${product.price}₴`;
        }

        const productImage = document.getElementById("productImage");
        const imageUrl = product.images?.[0] || product.image || "";

        if (productImage) {
            productImage.src = imageUrl;
            productImage.alt = product.title;
        }

        const productDescription = document.getElementById("productDescription");
        if (productDescription) {
            productDescription.textContent = product.description;
        }

        // =========================
        // Rating
        // =========================

        const rating = document.getElementById("productRating");

        if (rating) {

            rating.textContent =
                "⭐".repeat(product.rating) +
                "☆".repeat(5 - product.rating);

        }

        // =========================
        // Features
        // =========================

        const features = document.getElementById("productFeatures");

        if (features) {

            features.innerHTML = (product.features || [])
                .map(item => `<li>✔ ${item}</li>`)
                .join("");
        }

        // =========================
        // Compatible
        // =========================

        const compatible = document.getElementById("productCompatible");

        if (compatible) {

            compatible.innerHTML = product.compatible
                .map(item => `<li>${item}</li>`)
                .join("");

        }

        // =========================
        // Buy Button
        // =========================

        const buyButton = document.querySelector(".buy-btn");

        if (buyButton) {

            buyButton.addEventListener("click", () => {

                addToCart({

                    id: product.id,
                    title: product.title,
                    price: product.price,
                    image: imageUrl

                });

                buyButton.textContent = "✓ Додано";
                buyButton.disabled = true;
                buyButton.style.opacity = ".8";

            });

        }

        // =========================
        // Telegram Button
        // =========================

        const telegramButton = document.querySelector(".telegram-btn");

        if (telegramButton) {

            telegramButton.addEventListener("mouseenter", () => {

                telegramButton.style.transform =
                    "translateY(-3px) scale(1.02)";

            });

            telegramButton.addEventListener("mouseleave", () => {

                telegramButton.style.transform = "";

            });

        }

        // =========================
        // Image Hover
        // =========================

        const image = document.getElementById("productImage");

        if (image) {

            image.addEventListener("mouseenter", () => {

                image.style.transform = "scale(1.08)";
                image.style.transition = ".35s";

            });

            image.addEventListener("mouseleave", () => {

                image.style.transform = "scale(1)";

            });

        }

    }

    catch (err) {

        console.error(err);

    }

}
