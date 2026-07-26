// =========================
// Мова
// =========================

const form = document.getElementById("startForm");

if (form) {
    form.addEventListener("submit", (e) => {
        e.preventDefault();

        const data = new FormData(form);

        sessionStorage.setItem("name", data.get("name"));
        sessionStorage.setItem("phone", data.get("phone"));

        const service = data.get("service");

        window.location.href = `/${service}.html`;
    });
}

document.addEventListener("DOMContentLoaded", () => {

    const dropdown = document.getElementById("languageDropdown");

    if (!dropdown) return;

    const menu = dropdown.querySelector(".dropdown-menu");

    let timeout;

    function openMenu() {
        clearTimeout(timeout);
        menu.classList.add("show");
    }

    function closeMenu() {
        timeout = setTimeout(() => {
            menu.classList.remove("show");
        }, 300);
    }

    dropdown.addEventListener("mouseenter", openMenu);
    dropdown.addEventListener("mouseleave", closeMenu);

    menu.addEventListener("mouseenter", openMenu);
    menu.addEventListener("mouseleave", closeMenu);

});

// =========================
// Контакти
// =========================

const contactsDropdown = document.getElementById("contactsDropdown");

if (contactsDropdown) {

    const menu = contactsDropdown.querySelector(".dropdown-menu");

    let timeout;

    function openMenu() {
        clearTimeout(timeout);
        menu.classList.add("show");
    }

    function closeMenu() {
        timeout = setTimeout(() => {
            menu.classList.remove("show");
        }, 300);
    }

    contactsDropdown.addEventListener("mouseenter", openMenu);
    contactsDropdown.addEventListener("mouseleave", closeMenu);

    menu.addEventListener("mouseenter", openMenu);
    menu.addEventListener("mouseleave", closeMenu);
}