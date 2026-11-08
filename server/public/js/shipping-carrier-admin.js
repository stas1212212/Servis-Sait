"use strict";
document.addEventListener("DOMContentLoaded",()=>{
  const form=document.getElementById("carrierLocationForm");
  if(!form)return;
  const select=document.getElementById("carrierAdminSelect");
  const feedback=document.getElementById("carrierAdminFeedback");
  const t=key=>window.PultShippingI18n?.t(key)||key;
  let settings={};
  const names=["recipient_name","recipient_phone","city","warehouse","address","latitude","longitude"];
  function draw(){
    const value=settings[select.value]||{};
    for(const name of names)form.elements.namedItem(name).value=value[name]??"";
    feedback.textContent="";
  }
  const status=document.getElementById("shippingAdminMessage");
  const workspace=document.getElementById("shippingAdminWorkspace");
  // Carrier configuration must not wait on the legacy shipment/recipient API.
  // Every network request has a limit, so a stalled PostgreSQL request won't
  // leave the page silently stuck at "Перевіряємо доступ…".
  async function request(url,options={}){
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),10000);
    try{
      const response=await fetch(url,{credentials:"same-origin",...options,signal:controller.signal});
      let data;
      try{data=await response.json();}catch(error){data={};}
      if(!response.ok){
        const message=response.status===401?"Увійдіть у свій акаунт PULT+ та оновіть сторінку.":
          response.status===403?"Цей розділ доступний тільки адміністратору. Перевірте роль акаунта.":
          response.status===503?"Налаштування доставки ще не готові в PostgreSQL. Перевірте SQL-міграції у pgAdmin.":
          "Не вдалося завантажити настройки доставки (HTTP "+response.status+").";
        throw Error(data.message||message);
      }
      return data;
    }catch(error){
      if(error.name==="AbortError")throw Error("Сервер не відповів протягом 10 секунд. Перевірте PostgreSQL та роботу Node.js.");
      throw error;
    }finally{clearTimeout(timeout);}
  }
  async function load(){
    if(status)status.textContent="Завантажуємо відділення перевізників…";
    try{
      const data=await request("/api/shipping-carriers/admin/locations");
      settings=Object.fromEntries((data.locations||[]).map(entry=>[entry.carrier,entry]));
      draw();
      if(workspace)workspace.hidden=false;
      if(status)status.textContent="";
    }catch(error){
      if(status)status.textContent="Налаштування відділень недоступні: "+error.message;
      feedback.textContent=error.message;
      feedback.dataset.ok="false";
    }
  }
  select.addEventListener("change",draw);
  form.addEventListener("submit",async event=>{
    event.preventDefault();
    const submit=form.querySelector('button[type="submit"]');
    submit.disabled=true;
    const values=new FormData(form),body={};
    for(const name of names)body[name]=String(values.get(name)||"").trim();
    try{
      const result=await request("/api/shipping-carriers/admin/locations/"+encodeURIComponent(select.value),{
        method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
      settings[select.value]={...body,carrier:select.value};
      feedback.dataset.ok="true";
      feedback.textContent=result.message;
    }catch(error){feedback.dataset.ok="false";feedback.textContent=error.message;}
    finally{submit.disabled=false;}
  });
  load();
});