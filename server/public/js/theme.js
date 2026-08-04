// =========================
// Theme
// =========================

function initTheme() {

    const button = document.getElementById("themeButton");

    if (!button) return;

    const savedTheme = localStorage.getItem("theme");

    if (savedTheme === "dark") {

        document.body.classList.add("dark");
        button.textContent = "☀️";

    } else {

        button.textContent = "🌙";

    }

    button.addEventListener("click", () => {

        document.body.classList.toggle("dark");

        const dark = document.body.classList.contains("dark");

        localStorage.setItem("theme", dark ? "dark" : "light");

        button.textContent = dark ? "☀️" : "🌙";

    });

}