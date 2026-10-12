document.addEventListener("DOMContentLoaded", () => {
  const tab = document.getElementById("adminProductsTab");
  const panel = document.getElementById("adminProductsPanel");
  const list = document.getElementById("adminProductsList");
  const form = document.getElementById("adminProductForm");
  const search = document.getElementById("adminProductsSearch");
  const message = document.getElementById("adminMessage");
  let products = [];
  let currentId = null;

  function show(text, error = false) {
    message.textContent = text;
    message.className = error ? "admin-message-error" : "admin-message-ok";
  }

  function render() {
    list.replaceChildren();
    const q = search.value.trim().toLowerCase();
    for (const p of products.filter(x =>
      [x.name, x.sku, x.brand].some(v => String(v || "").toLowerCase().includes(q)))) {
      const card = document.createElement("article");
      card.className = "admin-request";
      const heading = document.createElement("h3");
      heading.textContent = p.name;
      const info = document.createElement("p");
      info.textContent = p.sku + " · " + p.price + " грн · " + p.stock + " шт. · " + (p.is_active ? "Активний" : "Прихований");
      const edit = document.createElement("button");
      edit.type = "button";
      edit.className = "admin-save";
      edit.textContent = "Редагувати";
      edit.addEventListener("click", () => openEditor(p));
      card.append(heading, info, edit);
      list.append(card);
    }
    if (!list.children.length) list.textContent = "Товарів не знайдено.";
  }

  function openEditor(p) {
    currentId = p ? p.id : null;
    form.reset();
    document.getElementById("adminProductFormTitle").textContent = p ? "Редагувати товар" : "Новий товар";
    if (p) {
      for (const key of ["sku", "name", "brand", "model", "description", "price", "stock", "image_url", "category"]) {
        if (p[key] != null) form.elements.namedItem(key).value = p[key];
      }
    }
    form.elements.namedItem("is_active").checked = p ? p.is_active : true;
    form.hidden = false;
    form.scrollIntoView({ block: "start" });
  }

  async function load() {
    try {
      const response = await fetch("/api/admin/products", { credentials: "same-origin" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Помилка завантаження");
      products = data.products || [];
      render();
    } catch (error) {
      show(error.message, true);
    }
  }

  tab.addEventListener("click", () => {
    document.getElementById("adminRepairsPanel").hidden = true;
    document.getElementById("adminOrdersPanel").hidden = true;
    panel.hidden = false;
    for (const id of ["adminRepairsTab", "adminOrdersTab"]) {
      const other = document.getElementById(id);
      other.classList.remove("active");
      other.setAttribute("aria-pressed", "false");
    }
    tab.classList.add("active");
    tab.setAttribute("aria-pressed", "true");
    load();
  });

  search.addEventListener("input", render);
  document.getElementById("adminProductsNew").addEventListener("click", () => openEditor(null));
  document.getElementById("adminProductCancel").addEventListener("click", () => { form.hidden = true; });

  form.addEventListener("submit", async event => {
    event.preventDefault();
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    const payload = Object.fromEntries(new FormData(form).entries());
    payload.is_active = form.elements.namedItem("is_active").checked;
    try {
      const response = await fetch(currentId ? "/api/admin/products/" + currentId : "/api/admin/products", {
        method: currentId ? "PUT" : "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Помилка збереження");
      form.hidden = true;
      show("Товар збережено.");
      await load();
    } catch (error) {
      show(error.message, true);
    } finally {
      button.disabled = false;
    }
  });
});