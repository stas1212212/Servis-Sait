// =========================
// Підвантаження header + footer
// =========================

document.addEventListener("DOMContentLoaded", async () => {
    document.documentElement.classList.toggle("dark", localStorage.getItem("theme") === "dark");
    document.body.classList.toggle("dark", localStorage.getItem("theme") === "dark");

    // Pages such as cabinet.html do not load every shared script themselves.
    for (const [check, src] of [["initLanguageDropdown","/js/dropdown.js"],["initBurgerMenu","/js/burger.js"],["initTheme","/js/theme.js"]]) {
        if (typeof window[check] !== "function") {
            await new Promise(resolve => {
                const script = document.createElement("script");
                script.src = src;
                script.onload = resolve;
                script.onerror = resolve;
                document.head.append(script);
            });
        }
    }
    // HEADER
    const header = document.getElementById("header");

    if (header) {

        const response = await fetch("/_header");
        header.innerHTML = await response.text();

        if (typeof initLanguageDropdown === "function") initLanguageDropdown();
        if (typeof initContactsDropdown === "function") initContactsDropdown();
        if (typeof initBurgerMenu === "function") initBurgerMenu();
        if (typeof initTheme === "function") initTheme();
        if (typeof updateCartCounter === "function") updateCartCounter();

        
    }

    // FOOTER
    const footer = document.getElementById("footer");

    if (footer) {

        const response = await fetch("footer.html");
        footer.innerHTML = await response.text();

    }

    await new Promise(resolve => {
        const script = document.createElement("script");
        script.src = "/js/i18n.js";
        script.onload = () => { if (typeof applySiteLanguage === "function") applySiteLanguage(); resolve(); };
        script.onerror = resolve;
        document.head.append(script);
    });
    initFormHandler();

});

// =========================
// Форма
// =========================

function initFormHandler() {

    const form = document.getElementById("startForm");

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
