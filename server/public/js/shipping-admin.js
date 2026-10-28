"use strict";
document.addEventListener("DOMContentLoaded",()=>{
  const $=id=>document.getElementById(id);
  const t=key=>window.PultShippingI18n?.t(key)||key;
  const message=$("shippingAdminMessage");
  const list=$("shippingAdminList");
  const recipientForm=$("shippingRecipientForm");
  const search=$("shippingAdminSearch");
  const codes=["not_sent","registered","in_transit","at_branch","received","cancelled"];
  let repairs=[];
  let instructionsReady=false;

  function node(tag,text,cls){
    const element=document.createElement(tag);
    if(text!==undefined)element.textContent=String(text??"");
    if(cls)element.className=cls;
    return element;
  }
  function info(label,value){
    const p=node("p",undefined,"ship-meta");
    p.append(node("strong",label+": "),node("span",String(value||"—")));
    return p;
  }
  async function api(path,options){
    const response=await fetch("/api/shipping/admin"+path,{credentials:"same-origin",...options});
    const data=await response.json();
    if(!response.ok)throw new Error(data.message||t("admin.apiError"));
    return data;
  }
  const mutation=body=>({method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
  function field(label,name,value,length,required=false,area=false){
    const wrapper=node("label",undefined,"ship-field");
    const input=node(area?"textarea":"input");
    input.name=name;input.value=value||"";
    input.maxLength=length;input.required=required;input.autocomplete="off";
    wrapper.append(node("span",label),input);
    return wrapper;
  }
  function createShipmentForm(repair,direction){
    const leg=repair.shipments[direction]||{};
    const incoming=direction==="incoming";
    const form=node("form",undefined,"ship-edit-form");
    form.append(node("h3",t(incoming?"admin.incoming":"admin.outgoing")));
    if(incoming&&leg.status==="received"){
      form.append(info(t("admin.deliveryStatus"),t("admin.arrived")),info(t("admin.ttn"),leg.tracking_number));
      return form;
    }
    const selectWrapper=node("label",undefined,"ship-field");
    const select=node("select");
    select.name="status";
    for(const code of codes){
      if(incoming&&code==="received")continue;
      const option=node("option",t("status."+code));
      option.value=code;option.selected=(leg.status||"not_sent")===code;
      select.append(option);
    }
    selectWrapper.append(node("span",t("admin.deliveryStatus")),select);
    const ttnField=field(t("admin.ttn"),"tracking_number",leg.tracking_number,14);
    const ttnInput=ttnField.querySelector("input");
    ttnInput.pattern="[0-9]{14}";
    ttnInput.inputMode="numeric";
    form.append(selectWrapper,ttnField);
    form.append(
      field(t(incoming?"admin.fromCity":"admin.toCity"),"city",leg.city,120),
      field(t(incoming?"admin.fromBranch":"admin.toBranch"),"warehouse",leg.warehouse,180)
    );
    if(!incoming){
      form.append(
        field(t("admin.returnName"),"recipient_name",leg.recipient_name||repair.name,120),
        field(t("admin.returnPhone"),"recipient_phone",leg.recipient_phone||repair.phone,30)
      );
    }
    const button=node("button",t("admin.saveShipment"),"ship-button");
    button.type="submit";
    const feedback=node("p","", "ship-result");
    feedback.setAttribute("role","status");
    form.append(button,feedback);
    form.addEventListener("submit",async event=>{
      event.preventDefault();button.disabled=true;
      const data=new FormData(form);
      const body={
        status:String(data.get("status")||"not_sent"),
        tracking_number:String(data.get("tracking_number")||"").trim(),
        city:String(data.get("city")||"").trim(),
        warehouse:String(data.get("warehouse")||"").trim(),
        recipient_name:incoming?"":String(data.get("recipient_name")||"").trim(),
        recipient_phone:incoming?"":String(data.get("recipient_phone")||"").trim()
      };
      try{
        await api("/repairs/"+repair.id+"/"+direction,mutation(body));
        await reload();
      }catch(error){feedback.textContent=error.message;feedback.dataset.ok="false";}
      finally{button.disabled=false;}
    });
    return form;
  }
  function createIntakeForm(repair){
    const intake=repair.intake||{};
    const form=node("form",undefined,"ship-edit-form");
    form.append(node("h3",t("admin.intake")));
    if(intake.received_at)form.append(info(t("admin.date"),new Date(intake.received_at).toLocaleString(window.PultShippingI18n?.language()==="en"?"en-GB":"uk-UA")));
    form.append(
      field(t("admin.condition"),"external_condition",intake.external_condition,1000,true,true),
      field(t("admin.accessories"),"accessories",intake.accessories,1000,true,true),
      field(t("admin.serial"),"serial_number",intake.serial_number,120),
      field(t("admin.notes"),"notes",intake.notes,1000,false,true)
    );
    const button=node("button",t(intake.received_at?"admin.updateIntake":"admin.acceptDevice"),"ship-button");
    button.type="submit";
    const feedback=node("p","", "ship-result");
    feedback.setAttribute("role","status");
    form.append(button,feedback);
    form.addEventListener("submit",async event=>{
      event.preventDefault();button.disabled=true;
      const data=new FormData(form),body={};
      for(const key of ["external_condition","accessories","serial_number","notes"])body[key]=String(data.get(key)||"").trim();
      try{
        await api("/repairs/"+repair.id+"/intake",mutation(body));
        await reload();
      }catch(error){feedback.textContent=error.message;feedback.dataset.ok="false";}
      finally{button.disabled=false;}
    });
    return form;
  }
  function createInstructions(repair){
    const panel=node("section",undefined,"ship-instructions");
    panel.append(node("h3",t("admin.instructionsTitle")));
    const incoming=repair.shipments.incoming;
    if(!incoming){
      panel.append(node("p",t("admin.shippingNotSelected")));
      return panel;
    }
    const snapshot=repair.send_to;
    panel.append(node("p",t(snapshot?"admin.instructionsReady":"admin.instructionsPending")));
    if(!instructionsReady){
      panel.append(node("p",t("admin.migrationMissing"),"ship-blocked"));
      return panel;
    }
    if(snapshot){
      panel.append(
        info(t("admin.name"),snapshot.recipient_name),
        info(t("admin.phone"),snapshot.recipient_phone),
        info(t("admin.city"),snapshot.city),
        info(t("admin.branch"),snapshot.warehouse));
      const copy=node("button",t("admin.copy"),"ship-button");
      copy.type="button";
      const feedback=node("span","", "ship-copy-feedback");
      feedback.setAttribute("role","status");
      copy.addEventListener("click",async()=>{
        const content=[
          "PULT+ · Nova Poshta",t("admin.repair")+repair.id,
          t("admin.name")+": "+snapshot.recipient_name,
          t("admin.phone")+": "+snapshot.recipient_phone,
          t("admin.city")+": "+snapshot.city,
          t("admin.branch")+": "+snapshot.warehouse
        ].join("\n");
        try{await navigator.clipboard.writeText(content);feedback.textContent=t("admin.copied");}
        catch(error){feedback.textContent=t("admin.copyFailed");}
      });
      panel.append(copy,feedback,node("p",t("admin.copyHint"),"ship-note"));
    }
    if(!incoming.tracking_number && ["not_sent","registered"].includes(incoming.status||"not_sent")){
      const approve=!snapshot;
      const button=node("button",t(approve?"admin.approve":"admin.revoke"),"ship-button");
      button.type="button";
      const feedback=node("span","", "ship-copy-feedback");
      feedback.setAttribute("role","status");
      button.addEventListener("click",async()=>{
        button.disabled=true;
        try{
          await api("/repairs/"+repair.id+"/instructions",mutation({approve}));
          await reload();
        }catch(error){feedback.textContent=error.message;button.disabled=false;}
      });
      panel.append(button,feedback);
    }
    return panel;
  }
  function render(){
    const term=search.value.trim().toLowerCase();
    const found=repairs.filter(repair=>[
      repair.id,repair.tracking_code,repair.name,repair.phone,repair.device_type,
      repair.shipments.incoming?.tracking_number,repair.shipments.outgoing?.tracking_number
    ].some(value=>String(value??"").toLowerCase().includes(term)));
    list.replaceChildren();
    if(!found.length){list.append(node("p",t("admin.noRequests")));return;}
    for(const repair of found){
      const card=node("article",undefined,"ship-card");
      card.append(node("h2",t("admin.repair")+repair.id));
      card.append(info(t("admin.customer"),repair.name+" · "+repair.phone));
      card.append(info(t("admin.device"),[repair.device_type,repair.brand,repair.model].filter(Boolean).join(" · ")));
      card.append(info(t("admin.repairStatus"),repair.status));
      card.append(createInstructions(repair));
      const forms=node("div",undefined,"ship-columns");
      forms.append(createShipmentForm(repair,"incoming"),createShipmentForm(repair,"outgoing"));
      card.append(forms,createIntakeForm(repair));
      list.append(card);
    }
  }
  async function reload(){
    const data=await api("/repairs");
    repairs=Array.isArray(data.repairs)?data.repairs:[];
    instructionsReady=!!data.instructions_ready;
    render();
  }
  recipientForm.addEventListener("submit",async event=>{
    event.preventDefault();
    const button=recipientForm.querySelector('button[type="submit"]');
    button.disabled=true;
    const data=new FormData(recipientForm),body={};
    for(const field of ["full_name","phone","city","warehouse"])body[field]=String(data.get(field)||"").trim();
    try{
      const result=await api("/recipient",mutation(body));
      $("shippingRecipientStatus").textContent=result.message;
      $("shippingRecipientStatus").dataset.ok="true";
    }catch(error){
      $("shippingRecipientStatus").textContent=error.message;
      $("shippingRecipientStatus").dataset.ok="false";
    }finally{button.disabled=false;}
  });
  search.addEventListener("input",render);
  window.addEventListener("pult:language-changed",render);
  (async()=>{
    try{
      const [recipient,records]=await Promise.all([api("/recipient"),api("/repairs")]);
      for(const field of ["full_name","phone","city","warehouse"])
        recipientForm.elements[field].value=recipient.recipient[field]||"";
      repairs=Array.isArray(records.repairs)?records.repairs:[];
      instructionsReady=!!records.instructions_ready;
      $("shippingAdminWorkspace").hidden=false;
      message.textContent="";
      render();
    }catch(error){message.textContent=error.message;}
  })();
});