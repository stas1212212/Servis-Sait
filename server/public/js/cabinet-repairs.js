document.addEventListener("DOMContentLoaded", async () => {
  const target = document.getElementById("repairsContent");
  if (!target) return;
  const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  try {
    const response = await fetch("/api/repairs/mine", { credentials: "same-origin" });
    if (response.status === 401) {
      target.textContent = "Увійдіть в акаунт, щоб переглянути свої заявки.";
      return;
    }
    if (!response.ok) throw new Error("Не вдалося завантажити заявки");
    const data = await response.json();
    const requests = Array.isArray(data.requests) ? data.requests : [];
    if (!requests.length) {
      target.innerHTML = '<p class="repair-history-empty">У вас поки немає заявок на ремонт.</p>';
      return;
    }
    const statuses = {pending:"Очікує розгляду",in_progress:"У роботі",waiting_parts:"Очікує запчастини",completed:"Завершено",cancelled:"Скасовано"};
    target.innerHTML = requests.map(item => {
      const date = item.created_at ? new Date(item.created_at).toLocaleDateString("uk-UA") : "—";
      const device = [item.device_type, item.brand, item.model].filter(Boolean).join(" · ");
      return `<article class="repair-history-item">
        <div class="repair-history-top"><strong>Заявка №${escapeHtml(item.id)}</strong><span>${escapeHtml(statuses[item.status] || item.status)}</span></div>
        <p><b>Пристрій:</b> ${escapeHtml(device)}</p>
        ${item.tracking_code ? `<p><b>Код відстеження:</b> <a href="/track.html?code=${encodeURIComponent(item.tracking_code)}">${escapeHtml(item.tracking_code)}</a></p>` : ""}
        <p><b>Проблема:</b> ${escapeHtml(item.issue)}</p>
        <small>${escapeHtml(date)}</small>
        ${item.status === "completed" ? `<p><a href="/reviews.html">Залишити відгук про завершений ремонт →</a></p>` : ""}
      </article>`;
    }).join("");
  } catch (error) {
    console.error("Repair history error:", error);
    target.textContent = "Не вдалося завантажити заявки. Спробуйте оновити сторінку.";
  }
});