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

    items.innerHTML = cart.map(product => `

        <div class="checkout-product">

            <img
                src="${product.image}"
                alt="${product.title}">

            <div>

                <h3>

                    ${product.title}

                </h3>

                <p>

                    ${product.quantity} × ${product.price}₴

                </p>

            </div>

        </div>

    `).join("");

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

function submitOrder(e) {

    e.preventDefault();

    const cart = getCart();

    if (!cart.length) {

        alert("Кошик порожній");

        return;

    }

    // Тут пізніше буде відправка на сервер

    localStorage.removeItem(CART_KEY);

    updateCartCounter();

    window.location.href = "thanks.html";

}