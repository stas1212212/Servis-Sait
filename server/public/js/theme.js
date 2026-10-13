// PULT+ theme: persistent across all pages.
(function () {
  const saved = localStorage.getItem("theme");
  const dark = saved === "dark";
  document.documentElement.classList.toggle("dark", dark);
  document.body?.classList.toggle("dark", dark);
})();

function initTheme() {
  const dark = localStorage.getItem("theme") === "dark";
  document.documentElement.classList.toggle("dark", dark);
  document.body.classList.toggle("dark", dark);
  document.querySelectorAll("[data-theme-toggle], #themeButton").forEach(button => {
    button.textContent = dark ? "☀️" : "🌙";
    button.setAttribute("aria-label", dark ? "Увімкнути світлу тему" : "Увімкнути темну тему");
    if (button.dataset.themeBound) return;
    button.dataset.themeBound = "true";
    button.addEventListener("click", () => {
      const next = !document.documentElement.classList.contains("dark");
      localStorage.setItem("theme", next ? "dark" : "light");
      document.documentElement.classList.toggle("dark", next);
      document.body.classList.toggle("dark", next);
      document.querySelectorAll("[data-theme-toggle], #themeButton").forEach(b => {
        b.textContent = next ? "☀️" : "🌙";
        b.setAttribute("aria-label", next ? "Увімкнути світлу тему" : "Увімкнути темну тему");
      });
    });
  });
}
