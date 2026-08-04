// =========================
// Burger Menu
// =========================

function initBurgerMenu() {

    const burger = document.getElementById("burgerButton");
    const menu = document.getElementById("burgerMenu");
    const overlay = document.getElementById("burgerOverlay");
    const close = document.getElementById("closeBurger");

    if (!burger || !menu || !overlay || !close) return;

    function openMenu() {

        menu.classList.remove("-translate-x-full");
        overlay.classList.remove("hidden");

        setTimeout(() => {
            overlay.classList.add("opacity-100");
        }, 10);

        document.body.style.overflow = "hidden";

    }

    function closeMenu() {

        menu.classList.add("-translate-x-full");

        overlay.classList.remove("opacity-100");

        setTimeout(() => {
            overlay.classList.add("hidden");
        }, 300);

        document.body.style.overflow = "";

    }

    burger.addEventListener("click", openMenu);
    close.addEventListener("click", closeMenu);
    overlay.addEventListener("click", closeMenu);

}