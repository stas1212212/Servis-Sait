document.addEventListener("DOMContentLoaded", () => {
  const workspace = document.getElementById("adminWorkspace");
  const message = document.getElementById("adminMessage");
  const list = document.getElementById("adminRequests");
  const search = document.getElementById("adminSearch");
  const statuses = { pending:"Нова", in_progress:"У роботі", waiting_parts:"Очікує запчастини", completed:"Завершена", cancelled:"Скасована" };
  let requests = [];

  function el(tag, text, className) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = String(text ?? "");
    if (className) node.className = className;
    return node;
  }
  function showMessage(value, error = false) {
    message.textContent = value;
    message.className = error ? "admin-message-error" : "admin-message-ok";
  }
  function stat(id, count) { document.getElementById(id).textContent = String(count); }
  function render() {
    stat("adminTotal", requests.length);
    stat("adminPending", requests.filter(x => x.status === "pending").length);
    stat("adminProgress", requests.filter(x => x.status === "in_progress").length);
    stat("adminDone", requests.filter(x => x.status === "completed").length);
    const q = search.value.trim().toLocaleLowerCase();
    const filtered = requests.filter(x => [x.id,x.name,x.phone,x.device_type,x.brand,x.model].some(v => String(v ?? "").toLocaleLowerCase().includes(q)));
    list.replaceChildren();
    if (!filtered.length) { list.append(el("p", "Заявок не знайдено.")); return; }
    for (const item of filtered) {
      const card = el("article", undefined, "admin-request");
      const head = el("div", undefined, "admin-request-head");
      head.append(el("strong", "Заявка №" + item.id));
      head.append(el("time", item.created_at ? new Date(item.created_at).toLocaleString("uk-UA") : "—"));
      card.append(head);
      for (const [label,value] of [["Код відстеження",item.tracking_code],["Клієнт",item.name],["Телефон",item.phone],["Email",item.email],["Пристрій",[item.device_type,item.brand,item.model].filter(Boolean).join(" · ")],["Несправність",item.issue],["Історія",item.issue_cause],["Тип ремонту",item.repair_type]]) {
        if (!value) continue;
        const p = el("p"); const b = el("b",label + ": "); p.append(b,document.createTextNode(String(value)));card.append(p);
      }
      const actions = el("div",undefined,"admin-request-actions");
      const select = el("select");
      select.setAttribute("aria-label","Статус заявки №"+item.id);
      for(const [value,label] of Object.entries(statuses)){const option=el("option",label);option.value=value;option.selected=item.status===value;select.append(option);}
      const button=el("button","Зберегти","admin-save");
      button.addEventListener("click",async()=>{
        button.disabled=true;
        try {
          const response=await fetch("/api/admin/repairs/"+item.id+"/status",{method:"PATCH",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({status:select.value})});
          const data=await response.json();
          if(!response.ok)throw new Error(data.message||"Не вдалося змінити статус");
          item.status=data.request.status;showMessage("Статус заявки №"+item.id+" оновлено.");render();
        }catch(error){showMessage(error.message,true)}finally{button.disabled=false}
      });
      actions.append(select,button);card.append(actions);list.append(card);
    }
  }
  async function load() {
    showMessage("Завантаження заявок...");
    try {
      const response=await fetch("/api/admin/repairs",{credentials:"same-origin"});
      const data=await response.json();
      if(!response.ok)throw new Error(response.status===403?"У вас немає прав адміністратора.":response.status===401?"Увійдіть в акаунт.":data.message||"Помилка завантаження");
      requests=Array.isArray(data.requests)?data.requests:[];
      workspace.hidden=false;showMessage("");render();
    }catch(error){workspace.hidden=true;showMessage(error.message,true)}
  }
  search.addEventListener("input",render);
  document.getElementById("adminRefresh").addEventListener("click",load);
  load();
});