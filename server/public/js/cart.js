// =========================
// Cart
// =========================

const CART_KEY = "pultplus-cart";

// =========================
// Get Cart
// =========================

function getCart() {

    return JSON.parse(localStorage.getItem(CART_KEY)) || [];

}

// =========================
// Save Cart
// =========================

function saveCart(cart) {

    localStorage.setItem(CART_KEY, JSON.stringify(cart));

    updateCartCounter();

}

// =========================
// Add Product
// =========================

function addToCart(product) {
    
    showCartModal(product);

    const cart = getCart();

    const existing = cart.find(item => item.id === product.id);

    if (existing) {

        existing.quantity++;

    } else {

        cart.push({

            ...product,

            quantity: 1

        });

    }

    saveCart(cart);

}

// =========================
// Remove Product
// =========================

function removeFromCart(id) {

    let cart = getCart();

    cart = cart.filter(item => item.id !== id);

    saveCart(cart);

}

// =========================
// Change Quantity
// =========================

function changeQuantity(id, amount) {

    const cart = getCart();

    const product = cart.find(item => item.id === id);

    if (!product) return;

    product.quantity += amount;

    if (product.quantity <= 0) {

        removeFromCart(id);

        return;

    }

    saveCart(cart);

}

// =========================
// Count
// =========================

function getCartCount() {

    const cart = getCart();

    return cart.reduce((sum, item) => sum + item.quantity, 0);

}

// =========================
// Total
// =========================

function getCartTotal() {

    const cart = getCart();

    return cart.reduce((sum, item) => {

        return sum + item.price * item.quantity;

    }, 0);

}

// =========================
// Counter
// =========================

function updateCartCounter() { 

    const count = getCartCount();

    const counter = document.getElementById("cartCounter");

    if (counter) {

        counter.textContent = count;
        counter.classList.toggle("hidden", count === 0);

    }

    const burgerCounter = document.getElementById("burgerCartCounter");

    if (burgerCounter) {

        burgerCounter.textContent = `(${count})`;

    }

}

document.addEventListener("DOMContentLoaded", updateCartCounter);