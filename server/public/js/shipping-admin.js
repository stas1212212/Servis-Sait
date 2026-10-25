"use strict";
document.addEventListener("DOMContentLoaded",()=>{
  const $=id=>document.getElementById(id);
  const message=$("shippingAdminMessage");
  const list=$("shippingAdminList");
  const recipientForm=$("shippingRecipientForm");
  const search=$("shippingAdminSearch");
  const statuses=[
    ["not_sent","Не відправлено"],
    ["registered","ТТН зареєстровано"],
    ["in_transit","У дорозі"],
    ["at_branch","У відділенні"],
    ["received","Отримано"],
    ["cancelled","Скасовано"]
  ];
  let repairs=[];
  function node(tag,text,cls){
    const x=document.createElement(tag);
    if(text!==undefined)x.textContent=String(text??"");
    if(cls)x.className=cls;
    return x;
  }
  function info(label,value){
    const p=node("p",undefined,"ship-meta");
    p.append(node("strong",label+": "),node("span",value||"—"));
    return p;
  }
  async function api(path,options){
    const r=await fetch("/api/shipping/admin"+path,{credentials:"same-origin",...options});
    const data=await r.json();
    if(!r.ok)throw new Error(data.message||"Помилка сервера");
    return data;
  }
  const mutation=body=>({method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
  function field(label,name,value,maxLength,required=false,area=false){
    const wrap=node("label",undefined,"ship-field"),caption=node("span",label);
    const input=node(area?"textarea":"input");
    input.name=name;input.value=value||"";input.maxLength=maxLength;input.required=required;
    input.autocomplete="off";
    wrap.append(caption,input);
    return wrap;
  }
  function createShipmentForm(repair,direction){
    const leg=repair.shipments[direction]||{};
    const incoming=direction==="incoming";
    const form=node("form",undefined,"ship-edit-form");
    form.append(node("h3",incoming?"📦 Вхідна доставка":"🚚 Зворотна доставка"));
    if(incoming&&leg.status==="received"){
      form.append(info("Статус","Пристрій прийнято, дані ТТН зафіксовано"),
                  info("ТТН",leg.tracking_number));
      return form;
    }
    const statusField=node("label",undefined,"ship-field");
    statusField.append(node("span","Статус доставки"));
    const select=node("select");select.name="status";
    for(const [code,label] of statuses){
      if(incoming&&code==="received")continue; // Intake only.
      const option=node("option",label);option.value=code;option.selected=(leg.status||"not_sent")===code;
      select.append(option);
    }
    statusField.append(select);
    const ttnField=field("ТТН (14 цифр)","tracking_number",leg.tracking_number,14);
    const ttnInput=ttnField.querySelector("input");ttnInput.pattern="[0-9]{14}";ttnInput.inputMode="numeric";
    form.append(statusField,ttnField);
    form.append(field(incoming?"Місто відправлення":"Місто отримання","city",leg.city,120));
    form.append(field(incoming?"Відділення відправника":"Відділення клієнта","warehouse",leg.warehouse,180));
    if(!incoming){
      form.append(field("ПІБ клієнта-одержувача","recipient_name",leg.recipient_name||repair.name,120));
      form.append(field("Телефон клієнта-одержувача","recipient_phone",leg.recipient_phone||repair.phone,30));
    }
    const button=node("button","Зберегти доставку","ship-button");button.type="submit";
    const feedback=node("p","", "ship-result");feedback.setAttribute("role","status");
    form.append(button,feedback);
    form.addEventListener("submit",async event=>{
      event.preventDefault();button.disabled=true;
      const d=new FormData(form);
      const body={
        status:String(d.get("status")||"not_sent"),
        tracking_number:String(d.get("tracking_number")||"").trim(),
        city:String(d.get("city")||"").trim(),
        warehouse:String(d.get("warehouse")||"").trim(),
        recipient_name:incoming?"":String(d.get("recipient_name")||"").trim(),
        recipient_phone:incoming?"":String(d.get("recipient_phone")||"").trim()
      };
      try{
        const result=await api("/repairs/"+repair.id+"/"+direction,mutation(body));
        feedback.textContent=result.message;feedback.dataset.ok="true";
        await reload();
      }catch(error){feedback.textContent=error.message;feedback.dataset.ok="false";}
      finally{button.disabled=false;}
    });
    return form;
  }
  function createIntakeForm(repair){
    const intake=repair.intake||{};
    const form=node("form",undefined,"ship-edit-form");
    form.append(node("h3","🛠 Акт приймання пристрою"));
    if(repair.intake)form.append(info("Дата приймання",new Date(repair.intake.received_at).toLocaleString("uk-UA")));
    form.append(
      field("Зовнішній стан пристрою","external_condition",intake.external_condition,1000,true,true),
      field("Комплектація (що передав клієнт)","accessories",intake.accessories,1000,true,true),
      field("Серійний номер (за наявності)","serial_number",intake.serial_number,120),
      field("Зауваження","notes",intake.notes,1000,false,true)
    );
    const button=node("button",intake.received_at?"Оновити акт приймання":"Прийняти пристрій","ship-button");
    button.type="submit";
    const feedback=node("p","", "ship-result");feedback.setAttribute("role","status");
    form.append(button,feedback);
    form.addEventListener("submit",async event=>{
      event.preventDefault();button.disabled=true;
      const d=new FormData(form),body={};
      for(const key of ["external_condition","accessories","serial_number","notes"])body[key]=String(d.get(key)||"").trim();
      try{
        const result=await api("/repairs/"+repair.id+"/intake",mutation(body));
        feedback.textContent=result.message;feedback.dataset.ok="true";
        await reload();
      }catch(error){feedback.textContent=error.message;feedback.dataset.ok="false";}
      finally{button.disabled=false;}
    });
    return form;
  }
  function render(){
    const term=search.value.trim().toLowerCase();
    const found=repairs.filter(r=>[r.id,r.tracking_code,r.name,r.phone,r.device_type,
      r.shipments.incoming?.tracking_number,r.shipments.outgoing?.tracking_number]
      .some(value=>String(value??"").toLowerCase().includes(term)));
    list.replaceChildren();
    if(!found.length){list.append(node("p","Немає відповідних заявок."));return;}
    for(const repair of found){
      const card=node("article",undefined,"ship-card");
      card.append(node("h2","Ремонт №"+repair.id));
      card.append(info("Клієнт",repair.name+" · "+repair.phone));
      card.append(info("Пристрій",[repair.device_type,repair.brand,repair.model].filter(Boolean).join(" · ")));
      card.append(info("Статус ремонту",repair.status));
      const forms=node("div",undefined,"ship-columns");
      forms.append(createShipmentForm(repair,"incoming"),createShipmentForm(repair,"outgoing"));
      card.append(forms,createIntakeForm(repair));
      list.append(card);
    }
  }
  async function reload(){
    const data=await api("/repairs");
    repairs=data.repairs||[];
    render();
  }
  recipientForm.addEventListener("submit",async(event)=>{
    event.preventDefault();
    const button=recipientForm.querySelector('button[type="submit"]');
    button.disabled=true;
    const d=new FormData(recipientForm),body={};
    for(const field of ["full_name","phone","city","warehouse"])body[field]=String(d.get(field)||"").trim();
    try{
      const response=await api("/recipient",mutation(body));
      $("shippingRecipientStatus").textContent=response.message;
      $("shippingRecipientStatus").dataset.ok="true";
    }catch(error){
      $("shippingRecipientStatus").textContent=error.message;
      $("shippingRecipientStatus").dataset.ok="false";
    }finally{button.disabled=false;}
  });
  search.addEventListener("input",render);
  (async()=>{
    try{
      const [recipient,records]=await Promise.all([api("/recipient"),api("/repairs")]);
      for(const field of ["full_name","phone","city","warehouse"]){
        recipientForm.elements[field].value=recipient.recipient[field]||"";
      }
      repairs=records.repairs||[];
      $("shippingAdminWorkspace").hidden=false;
      message.textContent="";
      render();
    }catch(error){message.textContent=error.message;}
  })();
});
