// =========================
// Cart Modal
// =========================

let cartModalEnabled =
    sessionStorage.getItem("cartModalEnabled") !== "false";

function showCartModal(product) {

    // Если пользователь уже выбрал
    // "Продовжити покупки"

    if (!cartModalEnabled) {

        showCartToast();

        return;

    }

    const overlay = document.getElementById("cartOverlay");
    const modal = document.getElementById("cartModal");

    document.getElementById("cartModalProduct").textContent =
        product.title;

    overlay.classList.add("show");
    modal.classList.add("show");

}

function closeCartModal() {

    document.getElementById("cartOverlay")
        .classList.remove("show");

    document.getElementById("cartModal")
        .classList.remove("show");

}

function showCartToast() {

    const toast = document.getElementById("cartToast");

    toast.classList.add("show");

    setTimeout(() => {

        toast.classList.remove("show");

    }, 2200);

}

function initCartModal() {

    const overlay = document.getElementById("cartOverlay");

    const continueBtn =
        document.getElementById("continueShopping");

    const cartBtn =
        document.getElementById("openCart");

    if (!overlay) return;

    overlay.addEventListener("click", () => {

        cartModalEnabled = false;

        sessionStorage.setItem(
            "cartModalEnabled",
            "false"
        );

        closeCartModal();

    });

    continueBtn.addEventListener("click", () => {

        cartModalEnabled = false;

        sessionStorage.setItem(
            "cartModalEnabled",
            "false"
        );

        closeCartModal();

    });

    cartBtn.addEventListener("click", () => {

        window.location.href = "cart.html";

    });

    document.addEventListener("keydown", (e) => {

        if (e.key === "Escape") {

            closeCartModal();

        }

    });

}

document.addEventListener(
    "DOMContentLoaded",
    initCartModal
);