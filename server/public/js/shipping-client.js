"use strict";
document.addEventListener("DOMContentLoaded",()=>{
  const status=document.getElementById("shippingStatus");
  const list=document.getElementById("shippingList");
  const labels={
    not_sent:"Не відправлено",registered:"ТТН зареєстровано",
    in_transit:"У дорозі (за даними сервісу)",at_branch:"У відділенні (за даними сервісу)",
    received:"Отримано",cancelled:"Скасовано"
  };
  function node(tag,text,cls){
    const x=document.createElement(tag);
    if(text!==undefined)x.textContent=String(text??"");
    if(cls)x.className=cls;
    return x;
  }
  function value(data,key){return typeof data?.[key]==="string"?data[key]:"";}
  async function save(url,payload){
    const r=await fetch(url,{method:"PUT",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
    const data=await r.json();
    if(!r.ok)throw new Error(data.message||"Не вдалося зберегти");
    return data;
  }
  function info(label,text){
    const line=node("p",undefined,"ship-meta");
    line.append(node("strong",label+": "),node("span",text||"Не вказано"));
    return line;
  }
  function field(label,name,preset,maxLength,required=false){
    const wrapper=node("label",undefined,"ship-field");
    const caption=node("span",label);
    const input=node("input");
    input.name=name;input.value=preset||"";
    input.maxLength=maxLength;input.required=required;
    input.autocomplete="off";
    wrapper.append(caption,input);
    return wrapper;
  }
  function formFor(repair,direction) {
    const item=repair.shipments[direction]||{};
    const isIncoming=direction==="incoming";
    const form=node("form",undefined,"ship-edit-form");
    const title=node("h4",isIncoming?"Додати вхідну ТТН":"Відділення для повернення");
    form.append(title);
    if(isIncoming){
      if(item.status && !["not_sent","registered"].includes(item.status)){
        form.append(info("Зміна ТТН", "Вже обробляється сервісом — зверніться до менеджера"));
        return form;
      }
      const f=field("Номер експрес-накладної (14 цифр)","tracking_number",value(item,"tracking_number"),14,true);
      f.querySelector("input").inputMode="numeric";
      f.querySelector("input").pattern="[0-9]{14}";
      form.append(f);
    }else{
      if(item.status && item.status!=="not_sent"){
        form.append(info("Зміна відділення","Накладну вже оформлено — зверніться до менеджера"));
        return form;
      }
      form.append(
        field("Місто","return_city",value(item,"city"),120,true),
        field("Відділення","return_warehouse",value(item,"warehouse"),180,true));
    }
    const btn=node("button","Зберегти","ship-button");btn.type="submit";
    const result=node("p","", "ship-result");result.setAttribute("role","status");
    form.append(btn,result);
    form.addEventListener("submit",async(event)=>{
      event.preventDefault();btn.disabled=true;result.textContent="";
      const data=new FormData(form);
      const payload=isIncoming
        ?{tracking_number:String(data.get("tracking_number")||"").trim()}
        :{return_city:String(data.get("return_city")||"").trim(),return_warehouse:String(data.get("return_warehouse")||"").trim()};
      try{
        const resultData=await save("/api/shipping/mine/"+repair.id+"/"+(isIncoming?"incoming":"return"),payload);
        result.textContent=resultData.message;result.dataset.ok="true";
        await load();
      }catch(error){result.textContent=error.message;result.dataset.ok="false";}
      finally{btn.disabled=false;}
    });
    return form;
  }
  function leg(direction,item){
    const wrapper=node("div",undefined,"ship-leg");
    wrapper.append(node("h3",direction==="incoming"?"📦 До сервісу":"🚚 Назад клієнту"));
    wrapper.append(info("Статус",labels[item?.status]||"Немає накладної"));
    wrapper.append(info("ТТН",item?.tracking_number||"Ще не вказано"));
    if(item?.city)wrapper.append(info("Місто",item.city));
    if(item?.warehouse)wrapper.append(info("Відділення",item.warehouse));
    if(item?.tracking_number){
      const a=node("a","Перевірити ТТН на сайті Нової пошти");
      a.href="https://novaposhta.ua/";
      a.target="_blank";a.rel="noopener noreferrer";
      wrapper.append(a);
    }
    return wrapper;
  }
  async function load(){
    try{
      const r=await fetch("/api/shipping/mine",{credentials:"same-origin"});
      const data=await r.json();
      if(!r.ok)throw new Error(data.message||"Не вдалося завантажити доставку");
      list.replaceChildren();
      status.textContent=data.repairs.length?"":"Заявок на ремонт поки немає.";
      for(const repair of data.repairs){
        const card=node("article",undefined,"ship-card");
        card.append(node("h2","Ремонт №"+repair.id));
        card.append(info("Пристрій",[repair.device_type,repair.brand,repair.model].filter(Boolean).join(" · ")));
        card.append(info("Код ремонту",repair.tracking_code));
        const grid=node("div",undefined,"ship-columns");
        grid.append(leg("incoming",repair.shipments.incoming),leg("outgoing",repair.shipments.outgoing));
        card.append(grid);
        if(repair.received_at)card.append(info("Прийомка",new Date(repair.received_at).toLocaleString("uk-UA")));
        if(repair.status!=="cancelled"){
          const forms=node("div",undefined,"ship-columns");
          forms.append(formFor(repair,"incoming"),formFor(repair,"outgoing"));
          card.append(forms);
        }
        list.append(card);
      }
    }catch(error){
      list.replaceChildren();
      status.textContent=error.message;
    }
  }
  load();
});