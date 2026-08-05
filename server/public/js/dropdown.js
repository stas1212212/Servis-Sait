// =========================
// Dropdown Menu
// =========================

function initDropdown(dropdownId) {

    const dropdown = document.getElementById(dropdownId);

    if (!dropdown) return;

    const menu = dropdown.querySelector(".dropdown-menu");

    if (!menu) return;

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
// Init
// =========================

function initLanguageDropdown() {

    initDropdown("languageDropdown");

}

function initContactsDropdown() {

    initDropdown("contactsDropdown");

}