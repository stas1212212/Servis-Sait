// =========================
// Підвантаження header + footer
// =========================

document.addEventListener("DOMContentLoaded", async () => {

    // HEADER
    const header = document.getElementById("header");

    if (header) {

        const response = await fetch("header.html");
        header.innerHTML = await response.text();

        initLanguageDropdown();
        initContactsDropdown();
        initBurgerMenu();
        initTheme();
        updateCartCounter();

        
    }

    // FOOTER
    const footer = document.getElementById("footer");

    if (footer) {

        const response = await fetch("footer.html");
        footer.innerHTML = await response.text();

    }

    initFormHandler();

});

// =========================
// Форма
// =========================

function initFormHandler() {

    const form = document.getElementById("startForm") || document.querySelector("form");

    if (!form) return;

    form.addEventListener("submit", (e) => {

        e.preventDefault();

        const data = new FormData(form);

        const name = data.get("name");
        const phone = data.get("phone");

        if (name) {
            sessionStorage.setItem("name", String(name));
        }

        if (phone) {
            sessionStorage.setItem("phone", String(phone));
        }

        const service = data.get("service");
        const targetPage = service ? `${service}.html` : "thanks.html";

        window.location.href = targetPage;

    });

}
