// =========================
// Контакты
// =========================

function initContactsDropdown() {

    const dropdown = document.getElementById("contactsDropdown");

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
        }, 200);
    }

    dropdown.addEventListener("mouseenter", openMenu);
    dropdown.addEventListener("mouseleave", closeMenu);

    menu.addEventListener("mouseenter", openMenu);
    menu.addEventListener("mouseleave", closeMenu);

}


// =========================
// Мова
// =========================

function initLanguageDropdown() {

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
        }, 200);
    }

    dropdown.addEventListener("mouseenter", openMenu);
    dropdown.addEventListener("mouseleave", closeMenu);

    menu.addEventListener("mouseenter", openMenu);
    menu.addEventListener("mouseleave", closeMenu);

}