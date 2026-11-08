/* PULT+ unified theme: auto (local 07:00–18:59), light, dark. */
(function () {
  const KEY = "pultplus-theme-mode";
  const OLD_KEY = "theme";
  const VALID = ["auto", "light", "dark"];
  let mode;
  try {
    const stored = localStorage.getItem(KEY);
    const legacy = localStorage.getItem(OLD_KEY);
    mode = VALID.includes(stored) ? stored : (legacy === "dark" || legacy === "light" ? legacy : "auto");
  } catch (_) { mode = "auto"; }
  function isDark() {
    const hour = new Date().getHours();
    return mode === "dark" || (mode === "auto" && (hour < 7 || hour >= 19));
  }
  function apply() {
    const dark = isDark();
    document.documentElement.classList.toggle("dark", dark);
    if (document.body) document.body.classList.toggle("dark", dark);
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
    document.querySelectorAll("[data-theme-mode]").forEach(button => {
      const active = button.dataset.themeMode === mode;
      button.setAttribute("aria-pressed", String(active));
      button.classList.toggle("theme-active", active);
    });
    document.querySelectorAll("[data-theme-toggle], #themeButton").forEach(button => {
      button.textContent = dark ? "☀️ Світла тема" : "🌙 Темна тема";
      button.setAttribute("aria-label", dark ? "Увімкнути світлу тему" : "Увімкнути темну тему");
    });
  }
  function setMode(next) {
    if (!VALID.includes(next)) return;
    mode = next;
    try { localStorage.setItem(KEY, next); localStorage.removeItem(OLD_KEY); } catch (_) {}
    apply();
  }
  function initTheme() {
    apply();
    document.querySelectorAll("[data-theme-toggle], #themeButton").forEach(button => {
      if (button.dataset.themeBound) return;
      button.dataset.themeBound = "true";
      button.addEventListener("click", () => setMode(isDark() ? "light" : "dark"));
    });
    const oldButton = document.getElementById("themeButton");
    if (oldButton && !document.getElementById("themeModePicker")) {
      const picker = document.createElement("div");
      picker.id = "themeModePicker";
      picker.className = "theme-mode-picker";
      picker.setAttribute("role", "group");
      picker.setAttribute("aria-label", "Режим оформлення");
      [["auto", "🕒 Авто"], ["light", "☀️ Світла"], ["dark", "🌙 Темна"]].forEach(([value, label]) => {
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.themeMode = value;
        button.textContent = label;
        button.addEventListener("click", () => setMode(value));
        picker.append(button);
      });
      oldButton.insertAdjacentElement("afterend", picker);
    }
    apply();
  }
  window.initTheme = initTheme;
  window.PultTheme = { setMode, apply, getMode: () => mode };
  if (!document.querySelector('link[data-pult-theme]')) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "/css/theme.css";
    link.dataset.pultTheme = "true";
    document.head.append(link);
  }
  apply();
  document.addEventListener("DOMContentLoaded", initTheme);
  // Recheck local clock while the tab stays open; manual choices never change automatically.
  setInterval(() => { if (mode === "auto") apply(); }, 60000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) apply(); });
})();
