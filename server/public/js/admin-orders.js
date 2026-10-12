document.addEventListener("DOMContentLoaded", () => {
  const repairsTab = document.getElementById("adminRepairsTab");
  const ordersTab = document.getElementById("adminOrdersTab");
  const repairsPanel = document.getElementById("adminRepairsPanel");
  const ordersPanel = document.getElementById("adminOrdersPanel");
  const list = document.getElementById("adminOrdersList");
  const search = document.getElementById("adminOrdersSearch");
  const message = document.getElementById("adminMessage");
  const statuses = { pending:"Нове", processing:"Обробляється", shipped:"Відправлено", completed:"Завершено", cancelled:"Скасовано" };
  let orders = [];
  function node(tag, text, className) {
    const e = document.createElement(tag);
    if (text !== undefined) e.textContent = String(text ?? "");
    if (className) e.className = className;
    return e;
  }
  function showError(text) { message.textContent = text; message.className = "admin-message-error"; }
  function render() {
    list.replaceChildren();
    const query = search.value.trim().toLocaleLowerCase();
    const matches = orders.filter(o => [o.id, o.customer_name, o.customer_email, ...(o.items || []).map(i => i.name)].some(v => String(v ?? "").toLocaleLowerCase().includes(query)));
    if (!matches.length) { list.append(node("p","Замовлень не знайдено.")); return; }
    for (const order of matches) {
      const card = node("article",undefined,"admin-request");
      const head = node("div",undefined,"admin-request-head");
      head.append(node("strong","Замовлення №"+order.id));
      head.append(node("time",order.created_at ? new Date(order.created_at).toLocaleString("uk-UA") : "—"));
      card.append(head);
      const fields = [["Клієнт",order.customer_name || "Користувач №"+order.user_id],["Email",order.customer_email],["Сума",order.total+" грн"]];
      for(const [label,value] of fields){if(value==null)continue;const p=node("p");p.append(node("b",label+": "),document.createTextNode(String(value)));card.append(p)}
      const products=node("div",undefined,"admin-order-items");
      products.append(node("b","Товари:"));
      for(const item of order.items || []) products.append(node("p",item.name+" × "+item.quantity+" — "+item.price+" грн/шт."));
      card.append(products);
      const actions=node("div",undefined,"admin-request-actions");
      const select=node("select");
      select.setAttribute("aria-label","Статус замовлення №"+order.id);
      if(!statuses[order.status]){const current=node("option",order.status);current.value=order.status;current.selected=true;current.disabled=true;select.append(current)}
      for(const [value,label] of Object.entries(statuses)){const option=node("option",label);option.value=value;option.selected=value===order.status;select.append(option)}
      const save=node("button","Зберегти","admin-save");
      save.addEventListener("click",async()=>{
        save.disabled=true;
        try {
          const response=await fetch("/api/admin/orders/"+order.id+"/status",{method:"PATCH",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({status:select.value})});
          const result=await response.json();
          if(!response.ok)throw new Error(result.message || "Помилка збереження");
          order.status=result.order.status;message.textContent="Статус замовлення №"+order.id+" оновлено.";message.className="admin-message-ok";render();
        }catch(error){showError(error.message)}finally{save.disabled=false}
      });
      actions.append(select,save);card.append(actions);list.append(card);
    }
  }
  async function load() {
    list.replaceChildren(node("p","Завантаження замовлень..."));
    try {
      const response=await fetch("/api/admin/orders",{credentials:"same-origin"});
      const data=await response.json();
      if(!response.ok)throw new Error(data.message || "Помилка завантаження замовлень");
      orders=Array.isArray(data.orders)?data.orders:[];render();
    }catch(error){list.replaceChildren();showError(error.message)}
  }
  repairsTab.addEventListener("click",()=>{
    repairsPanel.hidden=false;ordersPanel.hidden=true;repairsTab.classList.add("active");ordersTab.classList.remove("active");repairsTab.setAttribute("aria-pressed","true");ordersTab.setAttribute("aria-pressed","false");
  });
  ordersTab.addEventListener("click",()=>{
    repairsPanel.hidden=true;ordersPanel.hidden=false;ordersTab.classList.add("active");repairsTab.classList.remove("active");ordersTab.setAttribute("aria-pressed","true");repairsTab.setAttribute("aria-pressed","false");load();
  });
  search.addEventListener("input",render);
  document.getElementById("adminOrdersRefresh").addEventListener("click",load);
});