"use strict";
document.addEventListener("DOMContentLoaded", () => {
  const t=key=>window.PultShippingI18n?.t(key)||key;
  const form=document.getElementById("serviceRepairForm");
  if(!form)return;
  const buttons=Array.from(document.querySelectorAll(".service-brand"));
  const image=document.getElementById("serviceImage");
  const title=document.getElementById("serviceBrandTitle");
  const brandInput=document.getElementById("selectedBrand");
  const feedback=document.getElementById("serviceFeedback");
  for(const button of buttons)button.addEventListener("click",()=>{
    for(const other of buttons){other.classList.toggle("active",other===button);other.setAttribute("aria-pressed",String(other===button));}
    if(brandInput)brandInput.value=button.dataset.brand||"";
    if(title)title.textContent=button.dataset.brand||"";
    if(image&&button.dataset.image)image.src=button.dataset.image;
  });

  const section=document.createElement("fieldset");
  section.className="service-shipping";
  section.hidden=true;
  section.innerHTML=[
    '<legend data-shipping-i18n="form.legend">Доставка техніки поштою</legend>',
    '<label class="service-shipping-option"><input type="checkbox" name="shipping_enabled" id="shippingEnabled"> <span data-shipping-i18n="form.enable">Хочу надіслати пристрій на ремонт поштою</span></label>',
    '<div class="service-shipping-fields" id="shippingDetails" hidden>',
    '<p class="service-carrier-heading" data-shipping-i18n="form.selectIncoming">Якою поштою надішлете пристрій до PULT+?</p>',
    '<div class="service-carrier-options" role="group" aria-label="Вибір пошти для відправлення на ремонт">',
    '<label class="service-carrier-choice"><input type="radio" name="incoming_carrier" value="nova_poshta" checked><span data-shipping-i18n="form.nova">📦 Нова пошта</span></label>',
    '<label class="service-carrier-choice"><input type="radio" name="incoming_carrier" value="ukrposhta"><span data-shipping-i18n="form.ukr">📮 Укрпошта</span></label>',
    '</div>',
    '<p data-shipping-i18n="form.warning">Після подання заявки ви побачите обране відділення PULT+ та карту. Не відправляйте техніку до підтвердження менеджером.</p>',
    '<div class="service-carrier-return-heading" data-shipping-i18n="form.returnTitle">Куди повернути пристрій після ремонту?</div>',
    '<label><span data-shipping-i18n="form.returnCarrier">Пошта для повернення</span><select id="returnCarrier" name="return_carrier">',
    '<option value="same" data-shipping-i18n="form.sameCarrier">Тією самою поштою</option>',
    '<option value="nova_poshta" data-shipping-i18n="form.nova">📦 Нова пошта</option>',
    '<option value="ukrposhta" data-shipping-i18n="form.ukr">📮 Укрпошта</option>',
    '</select></label>',
    '<label><span data-shipping-i18n="form.returnCity">Місто для зворотної доставки</span><input name="return_city" maxlength="120" autocomplete="address-level2" data-shipping-placeholder="form.returnCityPlaceholder" placeholder="Наприклад, Київ"></label>',
    '<label><span id="returnBranchLabel" data-shipping-i18n="form.returnBranchNova">Відділення Нової пошти для повернення</span><input name="return_warehouse" maxlength="180" data-shipping-placeholder="form.returnBranchPlaceholder" placeholder="Номер або адреса відділення"></label>',
    '<p class="service-shipping-note" data-shipping-i18n="form.note">Після відправлення введіть трек-номер у кабінеті або передайте менеджеру.</p>',
    '</div>'
  ].join("");
  const before=feedback||form.querySelector('button[type="submit"]');
  if(before)form.insertBefore(section,before);
  window.PultShippingI18n?.apply();
  const shippingCheckbox=section.querySelector("#shippingEnabled");
  const shippingDetails=section.querySelector("#shippingDetails");
  const returnCity=section.querySelector('[name="return_city"]');
  const returnWarehouse=section.querySelector('[name="return_warehouse"]');
  const returnCarrier=section.querySelector("#returnCarrier");
  const incomingRadios=Array.from(section.querySelectorAll('input[name="incoming_carrier"]'));
  const returnBranchLabel=section.querySelector("#returnBranchLabel");
  function effectiveReturnCarrier(){
    const choice=returnCarrier.value;
    return choice==="same" ? incomingRadios.find(r=>r.checked)?.value||"nova_poshta" : choice;
  }
  function updateReturnLabel(){
    const key=effectiveReturnCarrier()==="ukrposhta"?"form.returnBranchUkr":"form.returnBranchNova";
    returnBranchLabel.dataset.shippingI18n=key;
    returnBranchLabel.textContent=t(key);
  }
  function showShipping(){
    shippingDetails.hidden=!shippingCheckbox.checked;
    returnCity.required=shippingCheckbox.checked;
    returnWarehouse.required=shippingCheckbox.checked;
    updateReturnLabel();
  }
  shippingCheckbox.addEventListener("change",showShipping);
  returnCarrier.addEventListener("change",updateReturnLabel);
  incomingRadios.forEach(radio=>radio.addEventListener("change",updateReturnLabel));
  window.addEventListener("pult:language-changed",()=>queueMicrotask(updateReturnLabel));
  showShipping();
  fetch("/api/shipping/availability",{credentials:"same-origin"})
    .then(r=>r.ok?r.json():{ready:false})
    .then(data=>{
      section.hidden=!data.ready;
      if(!data.ready){shippingCheckbox.checked=false;showShipping();}
    })
    .catch(()=>{section.hidden=true;shippingCheckbox.checked=false;showShipping();});

  form.addEventListener("submit",async event=>{
    event.preventDefault();
    const submit=form.querySelector('button[type="submit"]'),original=submit.textContent,data=new FormData(form);
    const payload={
      name:data.get("name"),phone:data.get("phone"),email:data.get("email"),
      device_type:form.dataset.deviceType,brand:data.get("brand"),model:data.get("model"),
      issue:data.get("problem"),issue_cause:data.get("history"),repair_type:data.get("repair_type")
    };
    if(!section.hidden&&shippingCheckbox.checked){
      const carrier=String(data.get("incoming_carrier")||"");
      const outgoing=String(data.get("return_carrier")||"same");
      payload.shipping={
        carrier,
        return_carrier:outgoing==="same"?carrier:outgoing,
        return_city:String(data.get("return_city")||"").trim(),
        return_warehouse:String(data.get("return_warehouse")||"").trim()
      };
    }
    submit.disabled=true;submit.textContent=t("form.submitting");feedback.textContent="";
    try{
      const response=await fetch("/api/repairs",{
        method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},
        body:JSON.stringify(payload)
      });
      const result=await response.json();
      if(!response.ok)throw new Error(result.message||result.error||t("form.error"));
      // Persist only minimal confirmation metadata in this browser tab.
      // Hash-based fallback works if sessionStorage is disabled (no phone/email in URL).
      const requestId=Number(result.request?.id);
      const code=String(result.request?.tracking_code||"");
      const hasCode=/^RP-[A-F0-9]{24,32}$/.test(code);
      const receipt={
        id:Number.isSafeInteger(requestId)&&requestId>0?requestId:null,
        code:hasCode?code:"",
        shipping:!!payload.shipping,
        carrier:payload.shipping?.carrier||null,
        token:/^[a-f0-9]{64}$/.test(result.delivery_token||"")?result.delivery_token:null
      };
      try{sessionStorage.setItem("pult:last-repair",JSON.stringify(receipt));}
      catch(error){/* The confirmation page can also read the location hash. */}
      const parameters=new URLSearchParams();
      if(receipt.id)parameters.set("id",String(receipt.id));
      if(hasCode)parameters.set("code",code);
      parameters.set("shipping",receipt.shipping?"1":"0");
      if(receipt.carrier)parameters.set("carrier",receipt.carrier);
      window.location.assign("/repair-submitted.html#"+parameters.toString());
    }catch(error){feedback.dataset.error="true";feedback.textContent=error.message||t("form.error");}
    finally{submit.disabled=false;submit.textContent=original;}
  });
});