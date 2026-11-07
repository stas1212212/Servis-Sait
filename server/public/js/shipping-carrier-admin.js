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
  async function load(){
    try{
      const response=await fetch("/api/shipping-carriers/admin/locations",{credentials:"same-origin"});
      const data=await response.json();
      if(!response.ok)throw Error(data.message||t("carrier.loadError"));
      settings=Object.fromEntries((data.locations||[]).map(entry=>[entry.carrier,entry]));
      draw();
    }catch(error){feedback.textContent=error.message;feedback.dataset.ok="false";}
  }
  select.addEventListener("change",draw);
  form.addEventListener("submit",async event=>{
    event.preventDefault();
    const submit=form.querySelector('button[type="submit"]');
    submit.disabled=true;
    const values=new FormData(form),body={};
    for(const name of names)body[name]=String(values.get(name)||"").trim();
    try{
      const response=await fetch("/api/shipping-carriers/admin/locations/"+encodeURIComponent(select.value),{
        method:"PUT",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
      const result=await response.json();
      if(!response.ok)throw Error(result.message||t("carrier.saveError"));
      settings[select.value]={...body,carrier:select.value};
      feedback.dataset.ok="true";
      feedback.textContent=result.message;
    }catch(error){feedback.dataset.ok="false";feedback.textContent=error.message;}
    finally{submit.disabled=false;}
  });
  load();
});