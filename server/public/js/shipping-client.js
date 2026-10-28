"use strict";
document.addEventListener("DOMContentLoaded",()=>{
  const status=document.getElementById("shippingStatus");
  const list=document.getElementById("shippingList");
  const t=key=>window.PultShippingI18n?.t(key)||key;
  let repairs=[];

  function node(tag,text,cls){
    const x=document.createElement(tag);
    if(text!==undefined)x.textContent=String(text??"");
    if(cls)x.className=cls;
    return x;
  }
  function info(label,value){
    const row=node("p",undefined,"ship-meta");
    row.append(node("strong",label+": "),node("span",value||t("client.empty")));
    return row;
  }
  function field(label,name,preset,length,required=false){
    const wrapper=node("label",undefined,"ship-field");
    const input=node("input");
    input.name=name;input.value=preset||"";input.maxLength=length;
    input.required=required;input.autocomplete="off";
    wrapper.append(node("span",label),input);
    return wrapper;
  }
  function formFor(repair,direction){
    const leg=repair.shipments[direction]||{};
    const incoming=direction==="incoming";
    const form=node("form",undefined,"ship-edit-form");
    form.append(node("h4",t(incoming?"client.incomingTitle":"client.returnTitle")));
    if(incoming){
      if(!repair.send_to){
        form.append(node("p",t("client.instructionsPending"),"ship-blocked"));
        return form;
      }
      if(leg.status && !["not_sent","registered"].includes(leg.status)){
        form.append(info(t("client.changeTtn"),t("client.contactManager")));
        return form;
      }
      const box=field(t("client.ttnField"),"tracking_number",leg.tracking_number,14,true);
      box.querySelector("input").pattern="[0-9]{14}";
      box.querySelector("input").inputMode="numeric";
      form.append(box);
    }else{
      if(leg.status && leg.status!=="not_sent"){
        form.append(info(t("client.changeBranch"),t("client.sentAlready")));
        return form;
      }
      form.append(field(t("client.city"),"return_city",leg.city,120,true));
      form.append(field(t("client.branch"),"return_warehouse",leg.warehouse,180,true));
    }
    const submit=node("button",t("client.save"),"ship-button");
    submit.type="submit";
    const feedback=node("p","", "ship-result");
    feedback.setAttribute("role","status");
    form.append(submit,feedback);
    form.addEventListener("submit",async event=>{
      event.preventDefault();
      submit.disabled=true;
      feedback.textContent="";
      const data=new FormData(form);
      const payload=incoming
        ?{tracking_number:String(data.get("tracking_number")||"").trim()}
        :{return_city:String(data.get("return_city")||"").trim(),
          return_warehouse:String(data.get("return_warehouse")||"").trim()};
      try{
        const response=await fetch("/api/shipping/mine/"+repair.id+"/"+(incoming?"incoming":"return"),{
          method:"PUT",credentials:"same-origin",
          headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
        const result=await response.json();
        if(!response.ok)throw new Error(result.message||t("client.saveError"));
        await load();
      }catch(error){feedback.textContent=error.message;feedback.dataset.ok="false";}
      finally{submit.disabled=false;}
    });
    return form;
  }
  function shippingLeg(direction,leg){
    const item=leg||{};
    const div=node("div",undefined,"ship-leg");
    div.append(node("h3",t(direction==="incoming"?"client.incoming":"client.outgoing")));
    div.append(info(t("client.status"),item.status?t("status."+item.status):t("client.noWaybill")));
    div.append(info(t("client.ttn"),item.tracking_number||t("client.notSet")));
    if(item.city)div.append(info(t("client.city"),item.city));
    if(item.warehouse)div.append(info(t("client.branch"),item.warehouse));
    if(item.tracking_number){
      const link=node("a",t("client.checkCarrier"));
      link.href="https://novaposhta.ua/";
      link.target="_blank";
      link.rel="noopener noreferrer";
      div.append(link);
    }
    return div;
  }
  function recipientInstructions(repair){
    const panel=node("section",undefined,"ship-instructions");
    panel.append(node("h3",t("client.instructionsTitle")));
    const recipient=repair.send_to;
    if(!recipient){
      panel.classList.add("ship-instructions-pending");
      panel.append(node("p",t("client.instructionsPending")));
      return panel;
    }
    panel.classList.add("ship-instructions-approved");
    panel.append(node("p",t("client.instructionsReady")));
    panel.append(
      info(t("client.recipientName"),recipient.recipient_name),
      info(t("client.recipientPhone"),recipient.recipient_phone),
      info(t("client.city"),recipient.city),
      info(t("client.branch"),recipient.warehouse));
    const copy=node("button",t("client.copyDetails"),"ship-button");
    copy.type="button";
    const feedback=node("span","", "ship-copy-feedback");
    feedback.setAttribute("role","status");
    copy.addEventListener("click",async()=>{
      const lines=[
        "PULT+ · Nova Poshta",
        t("client.repair")+repair.id,
        t("client.recipientName")+": "+recipient.recipient_name,
        t("client.recipientPhone")+": "+recipient.recipient_phone,
        t("client.city")+": "+recipient.city,
        t("client.branch")+": "+recipient.warehouse
      ];
      try{await navigator.clipboard.writeText(lines.join("\n"));feedback.textContent=t("client.copied");}
      catch(error){feedback.textContent=t("client.copyFailed");}
    });
    panel.append(copy,feedback);
    return panel;
  }
  function render(){
    list.replaceChildren();
    status.textContent=repairs.length?"":t("client.noRequests");
    for(const repair of repairs){
      const card=node("article",undefined,"ship-card");
      card.append(node("h2",t("client.repair")+repair.id));
      card.append(info(t("client.device"),[repair.device_type,repair.brand,repair.model].filter(Boolean).join(" · ")));
      card.append(info(t("client.repairCode"),repair.tracking_code));
      const hasDelivery=!!(repair.shipments?.incoming || repair.shipments?.outgoing);
      if(!hasDelivery){
        card.append(node("p",t("client.noDelivery"),"ship-blocked"));
        list.append(card);
        continue;
      }
      card.append(recipientInstructions(repair));
      const grid=node("div",undefined,"ship-columns");
      grid.append(shippingLeg("incoming",repair.shipments.incoming),shippingLeg("outgoing",repair.shipments.outgoing));
      card.append(grid);
      if(repair.received_at)card.append(info(t("client.receivedAt"),new Date(repair.received_at).toLocaleString(window.PultShippingI18n?.language()==="en"?"en-GB":"uk-UA")));
      if(repair.status!=="cancelled"){
        const forms=node("div",undefined,"ship-columns");
        forms.append(formFor(repair,"incoming"),formFor(repair,"outgoing"));
        card.append(forms);
      }
      list.append(card);
    }
  }
  async function load(){
    try{
      const response=await fetch("/api/shipping/mine",{credentials:"same-origin"});
      const data=await response.json();
      if(!response.ok)throw new Error(data.message||t("client.loadError"));
      repairs=Array.isArray(data.repairs)?data.repairs:[];
      render();
    }catch(error){list.replaceChildren();status.textContent=error.message;}
  }
  window.addEventListener("pult:language-changed",render);
  load();
});