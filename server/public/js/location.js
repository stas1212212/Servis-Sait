/* PULT+ Google Maps location panel. Uses the existing public site settings API. */
(() => {
  "use strict";

  const SETTINGS_ENDPOINT = "/api/experience/settings";
  const WIDGET_SELECTOR = "[data-location-widget]";
  let lastSettings = null;
  function translated(key, fallback) {
    if (typeof PULT_I18N !== "undefined") {
      const lang = document.documentElement?.lang || "uk";
      return PULT_I18N[lang]?.[key] || fallback;
    }
    return fallback;
  }


  function clean(value, maxLength) {
    return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
  }

  function createMapUrl(address) {
    const url = new URL("https://www.google.com/maps");
    url.searchParams.set("q", address);
    url.searchParams.set("output", "embed");
    return url.toString();
  }

  function createDirectionsUrl(address) {
    const url = new URL("https://www.google.com/maps/dir/");
    url.searchParams.set("api", "1");
    url.searchParams.set("destination", address);
    return url.toString();
  }

  function mountWidget(widget, settings) {
    const address = clean(settings.address, 200);
    const phone = clean(settings.phone, 35);
    const hours = clean(settings.business_hours, 150);

    const textValues = {
      "[data-location-address]": address || translated("location.addressEmpty","Адреса уточнюється"),
      "[data-location-hours]": hours || translated("location.hoursEmpty","Графік роботи уточнюється"),
      "[data-location-phone]": phone || translated("location.phoneEmpty","Номер телефону уточнюється")
    };

    for (const [selector, value] of Object.entries(textValues)) {
      const element = widget.querySelector(selector);
      if (element) element.textContent = value;
    }

    const mapContainer = widget.querySelector("[data-location-map]");
    const directions = widget.querySelector("[data-location-directions]");
    if (!mapContainer) return;

    // Never display a fake pin or send an empty/placeholder query to Google.
    if (!address) {
      mapContainer.replaceChildren();
      const placeholder = document.createElement("div");
      placeholder.className = "pult-location-empty";
      const icon = document.createElement("span");
      icon.className = "pult-location-empty-icon";
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = "⌖";
      const label = document.createElement("p");
      label.textContent = translated("location.empty","Карта з’явиться після уточнення адреси сервісного центру.");
      placeholder.append(icon, label);
      mapContainer.append(placeholder);
      if (directions) directions.hidden = true;
      return;
    }

    const iframe = document.createElement("iframe");
    iframe.title = "Google Maps — розташування сервісного центру PULT+";
    iframe.src = createMapUrl(address);
    iframe.loading = "lazy";
    iframe.referrerPolicy = "no-referrer-when-downgrade";
    iframe.setAttribute("allowfullscreen", "");
    iframe.setAttribute("aria-label", "Карта розташування PULT+");
    mapContainer.replaceChildren(iframe);

    if (directions) {
      directions.href = createDirectionsUrl(address);
      directions.target = "_blank";
      directions.rel = "noopener noreferrer";
      directions.hidden = false;
    }
  }

  async function initLocationWidgets() {
    const widgets = document.querySelectorAll(WIDGET_SELECTOR);
    if (!widgets.length) return;

    try {
      const response = await fetch(SETTINGS_ENDPOINT, {
        credentials: "same-origin",
        headers: { Accept: "application/json" },
        cache: "no-store"
      });
      if (!response.ok) throw new Error("Site settings unavailable");
      const data = await response.json();
      const settings = data && typeof data.settings === "object" && data.settings
        ? data.settings : {};
      lastSettings = settings;
      widgets.forEach(widget => mountWidget(widget, settings));
    } catch (error) {
      // A database outage should not block browsing the homepage or shop.
      console.warn("PULT+ location is temporarily unavailable:", error.message);
      lastSettings = {};
      widgets.forEach(widget => mountWidget(widget, {}));
    }
  }

  if (typeof window !== "undefined") window.addEventListener("pult:language-changed",()=>{
    if(lastSettings!==null)document.querySelectorAll(WIDGET_SELECTOR)
      .forEach(widget=>mountWidget(widget,lastSettings));
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initLocationWidgets, { once: true });
  } else {
    initLocationWidgets();
  }
})();
