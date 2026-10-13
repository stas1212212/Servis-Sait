"use strict";
document.addEventListener("DOMContentLoaded",()=>{
  const base="/api/experience/admin";
  const $=id=>document.getElementById(id);
  const el=(tag,text,cls)=>{const x=document.createElement(tag);if(text!==undefined)x.textContent=String(text);if(cls)x.className=cls;return x;};
  const request=async(url,options)=>{
    const r=await fetch(base+url,{credentials:"same-origin",...options});
    const data=await r.json();if(!r.ok)throw new Error(data.message||"Помилка сервера");return data;
  };
  const mutation=(method,body)=>({method,headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
  let authorized=false;
  async function notifications(){
    if(!authorized)return;
    try{
      const data=await request("/notifications");
      $("adminUnreadCount").textContent=String(data.unread);
      const list=$("adminNotificationList");list.replaceChildren();
      if(!data.notifications.length){list.append(el("p","Нових повідомлень немає."));return;}
      for(const n of data.notifications){
        const item=el("article",undefined,"exp-admin-item");
        const title=el("strong",n.message+(n.is_read?"":" · Нове"));
        const time=el("small",new Date(n.created_at).toLocaleString("uk-UA"));
        const link=el("a","Відкрити розділ →");link.href=n.kind==="order"?"/admin.html#orders":"/admin.html#repairs";
        item.append(title,el("p",time.textContent),link);
        if(!n.is_read){
          const btn=el("button","Прочитано");
          btn.addEventListener("click",async()=>{
            btn.disabled=true;
            try{await request("/notifications/"+n.id+"/read",mutation("PATCH",{}));await notifications();}
            catch(e){$("hubStatus").textContent=e.message;btn.disabled=false;}
          });
          item.append(el("p"),btn);
        }
        list.append(item);
      }
    }catch(e){$("hubStatus").textContent=e.message;}
  }
  async function settings(){
    const data=await request("/settings");
    for(const name of ["phone","email","telegram","address","business_hours"]){
      const input=$("setting_"+name);
      if(input)input.value=data.settings[name]||"";
    }
  }
  async function reviews(){
    const data=await request("/reviews");
    const list=$("adminReviewList");list.replaceChildren();
    if(!data.reviews.length){list.append(el("p","Відгуків поки немає."));return;}
    for(const r of data.reviews){
      const item=el("article",undefined,"exp-admin-item");
      item.append(el("strong","Ремонт №"+r.service_request_id+" — "+r.rating+"/5 · "+r.author),
        el("p",r.comment),el("small","Статус: "+r.status));
      for(const [status,label] of [["approved","Опублікувати"],["rejected","Відхилити"]]){
        const btn=el("button",label);btn.disabled=r.status===status;
        btn.addEventListener("click",async()=>{
          btn.disabled=true;try{
            await request("/reviews/"+r.id,mutation("PATCH",{status}));
            await reviews();$("hubStatus").textContent="Відгук оновлено.";
          }catch(e){$("hubStatus").textContent=e.message;btn.disabled=false;}
        });
        item.append(btn);
      }
      list.append(item);
    }
  }
  $("settingsForm").addEventListener("submit",async event=>{
    event.preventDefault();
    const button=$("settingsSave");button.disabled=true;
    const settings={};
    for(const name of ["phone","email","telegram","address","business_hours"])settings[name]=$("setting_"+name).value;
    try{
      const data=await request("/settings",mutation("PUT",{settings}));
      $("hubStatus").textContent=data.message;await settings();
    }catch(e){$("hubStatus").textContent=e.message;}
    finally{button.disabled=false;}
  });
  (async()=>{
    try{
      await Promise.all([settings(),reviews()]);
      authorized=true;$("hubWorkspace").hidden=false;$("hubStatus").textContent="";
      await notifications();setInterval(notifications,30000);
    }catch(e){$("hubStatus").textContent="Не вдалося відкрити панель: "+e.message;}
  })();
});