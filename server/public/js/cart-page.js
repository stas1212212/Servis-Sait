// =========================
// Cart Page
// =========================

document.addEventListener("DOMContentLoaded", renderCart);

function renderCart() {

    const cart = getCart();

    const cartItems = document.getElementById("cartItems");
    const emptyCart = document.getElementById("emptyCart");

    if (!cartItems) return;

    if (cart.length === 0) {

        cartItems.innerHTML = "";

        emptyCart.classList.remove("hidden");

        updateSummary();

        return;

    }

    emptyCart.classList.add("hidden");

    cartItems.innerHTML = cart.map(product => `

        <div class="cart-item">

            <img src="${product.image}" alt="${product.title}">

            <div class="cart-info">

                <h3>${product.title}</h3>

                <p>${product.description || ""}</p>

                <div class="cart-price">

                    ${product.price}₴

                </div>

                <div class="cart-controls">

                    <div class="quantity-box">

                        <button
                            class="quantity-btn"
                            onclick="changeProductQuantity('${product.id}',-1)">

                            −

                        </button>

                        <div class="quantity-value">

                            ${product.quantity}

                        </div>

                        <button
                            class="quantity-btn"
                            onclick="changeProductQuantity('${product.id}',1)">

                            +

                        </button>

                    </div>

                    <button
                        class="remove-btn"
                        onclick="deleteProduct('${product.id}')">

                        Видалити

                    </button>

                </div>

            </div>

        </div>

    `).join("");

    updateSummary();

}
// =========================
// Summary
// =========================

function updateSummary() {

    const cart = getCart();

    const count = cart.reduce((sum, item) => sum + item.quantity, 0);

    const total = cart.reduce((sum, item) => {

        return sum + item.price * item.quantity;

    }, 0);

    document.getElementById("summaryCount").textContent = count;

    document.getElementById("summaryPrice").textContent = `${total}₴`;

}

// =========================
// Quantity
// =========================

function changeProductQuantity(id, value) {

    changeQuantity(id, value);

    renderCart();

    updateCartCounter();

}

// =========================
// Remove
// =========================

function deleteProduct(id) {

    removeFromCart(id);

    renderCart();

    updateCartCounter();

}

// =========================
// Checkout
// =========================

const checkoutButton = document.getElementById("checkoutButton");

if (checkoutButton) {

    checkoutButton.addEventListener("click", () => {

        const cart = getCart();

        if (!cart.length) {

            alert("Кошик порожній");

            return;

        }

        window.location.href = "checkout.html";

    });

}