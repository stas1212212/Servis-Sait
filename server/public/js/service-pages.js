"use strict";
document.addEventListener("DOMContentLoaded", () => {
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
    '<legend>Доставка Новою поштою</legend>',
    '<label class="service-shipping-option"><input type="checkbox" name="shipping_enabled" id="shippingEnabled"> Надіслати пристрій у PULT+ через відділення Нової пошти</label>',
    '<div class="service-shipping-fields" id="shippingDetails" hidden>',
    '<p>Перед відправленням менеджер повідомить реквізити фізичної особи-одержувача. Не надсилайте пристрій до підтвердження.</p>',
    '<label>Місто для зворотної доставки<input name="return_city" maxlength="120" autocomplete="address-level2" placeholder="Наприклад, Київ"></label>',
    '<label>Відділення Нової пошти для повернення<input name="return_warehouse" maxlength="180" placeholder="Номер або адреса відділення"></label>',
    '<p class="service-shipping-note">Після відправлення введіть ТТН у кабінеті. Якщо подаєте заявку без акаунта — передайте ТТН менеджеру.</p>',
    '</div>'
  ].join("");
  const before=feedback||form.querySelector('button[type="submit"]');
  if(before)form.insertBefore(section,before);
  const shippingCheckbox=section.querySelector("#shippingEnabled");
  const shippingDetails=section.querySelector("#shippingDetails");
  const returnCity=section.querySelector('[name="return_city"]');
  const returnWarehouse=section.querySelector('[name="return_warehouse"]');
  function showShipping(){
    shippingDetails.hidden=!shippingCheckbox.checked;
    returnCity.required=shippingCheckbox.checked;
    returnWarehouse.required=shippingCheckbox.checked;
  }
  shippingCheckbox.addEventListener("change",showShipping);
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
    if(!section.hidden&&shippingCheckbox.checked)payload.shipping={
      return_city:String(data.get("return_city")||"").trim(),
      return_warehouse:String(data.get("return_warehouse")||"").trim()
    };
    submit.disabled=true;submit.textContent="Відправлення...";feedback.textContent="";
    try{
      const response=await fetch("/api/repairs",{
        method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},
        body:JSON.stringify(payload)
      });
      const result=await response.json();
      if(!response.ok)throw new Error(result.message||result.error||"Не вдалося відправити заявку");
      const code=result.request?.tracking_code||"уточніть у кабінеті";
      const extra=payload.shipping?" Менеджер узгодить реквізити отримувача. Після відправлення внесіть ТТН на сторінці /shipping.html.":"";
      feedback.dataset.error="false";
      feedback.textContent="Заявку успішно надіслано! Код відстеження: "+code+
        ". Збережіть його. Статус ремонту: /track.html."+extra;
      form.reset();if(brandInput)brandInput.value=buttons.find(b=>b.classList.contains("active"))?.dataset.brand||"";
      showShipping();
    }catch(error){feedback.dataset.error="true";feedback.textContent=error.message||"Помилка відправлення заявки";}
    finally{submit.disabled=false;submit.textContent=original;}
  });
});