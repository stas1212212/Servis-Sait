// =========================
// Checkout
// =========================

document.addEventListener("DOMContentLoaded", () => {

    renderCheckout();

    const form = document.getElementById("checkoutForm");

    if (form) {

        form.addEventListener("submit", submitOrder);

    }

});

// =========================
// Render
// =========================

function renderCheckout() {

    const cart = getCart();

    const items = document.getElementById("checkoutItems");

    if (!items) return;

    // All product types use the same SKU cart. Never interpolate admin product names
    // directly into HTML; customer/local storage can contain arbitrary text.
    items.replaceChildren();
    for(const product of cart){
        const card=document.createElement("article");
        card.className="checkout-product";
        const image=typeof product.image==="string"&&
          /^\/?(?:img|png)\/[a-zA-Z0-9/_-]+\.(webp|png|jpe?g|avif)$/i.test(product.image)
          ?product.image:"";
        if(image){
            const img=document.createElement("img");
            img.src=image;
            img.alt=String(product.title||"Товар");
            card.append(img);
        }else{
            const placeholder=document.createElement("div");
            placeholder.className="store-cart-photo-placeholder";
            placeholder.textContent="📦";
            card.append(placeholder);
        }
        const details=document.createElement("div");
        const name=document.createElement("h3");
        name.textContent=String(product.title||product.id||"Товар");
        const quantity=document.createElement("p");
        quantity.textContent=Number(product.quantity)+" × "+Number(product.price).toFixed(2)+" ₴";
        details.append(name,quantity);
        card.append(details);
        items.append(card);
    }

    const count = cart.reduce((sum, item) => sum + item.quantity, 0);

    const total = cart.reduce((sum, item) => {

        return sum + item.price * item.quantity;

    }, 0);

    document.getElementById("checkoutCount").textContent = count;

    document.getElementById("checkoutTotal").textContent = `${total}₴`;

}
// =========================
// Submit
// =========================

async function submitOrder(e) {

    e.preventDefault();

    const cart = getCart();

    if (!cart.length) {

        alert("Кошик порожній");

        return;

    }

    const items = cart.map(product => ({
        sku: String(product.id),
        quantity: product.quantity
    }));

    try {

        const response = await fetch("/api/orders", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                items: items
            })
        });

        const data = await response.json();

        if (!response.ok) {

            throw new Error(data.message || "Не вдалося оформити замовлення");

        }

        // Замовлення успішно створене
        localStorage.removeItem(CART_KEY);

        updateCartCounter();

        window.location.href = "thanks.html";

    } catch (error) {

        console.error("Checkout error:", error);

        alert(error.message || "Помилка оформлення замовлення");

    }

}