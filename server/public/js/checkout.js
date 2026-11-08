"use strict";
document.addEventListener("DOMContentLoaded", () => {
  renderCheckout();
  const form=document.getElementById("checkoutForm");
  const method=document.getElementById("checkoutDeliveryMethod");
  if(!form||!method)return;
  const controls=form.elements;
  const details=document.getElementById("checkoutDeliveryDetails");
  function updateDelivery(){
    const requires=method.value!=="discuss";
    details.hidden=!requires;
    controls.namedItem("delivery_city").required=requires;
    controls.namedItem("delivery_branch").required=requires;
  }
  method.addEventListener("change",updateDelivery);
  updateDelivery();
  form.addEventListener("submit",submitOrder);
  fetch("/api/auth/me",{credentials:"same-origin",headers:{"Accept":"application/json"}})
    .then(r=>r.ok?r.json():null)
    .then(data=>{
      if(!data?.user)return;
      if(!controls.namedItem("customer_name").value)controls.namedItem("customer_name").value=data.user.name||"";
      if(!controls.namedItem("customer_email").value)controls.namedItem("customer_email").value=data.user.email||"";
    }).catch(()=>{});
});

function renderCheckout(){
  const cart=getCart();
  const items=document.getElementById("checkoutItems");
  if(!items)return;
  const submit=document.querySelector(".checkout-button");
  if(submit)submit.disabled=cart.length===0;
  items.replaceChildren();
  for(const product of cart){
    const card=document.createElement("article");
    card.className="checkout-product";
    const image=typeof product.image==="string"&&
      /^\/?(?:img|png)\/[a-zA-Z0-9/_-]+\.(webp|png|jpe?g|avif)$/i.test(product.image)?product.image:"";
    if(image){
      const img=document.createElement("img");img.src=image;
      img.alt=String(product.title||"Товар");card.append(img);
    }else{
      const box=document.createElement("div");
      box.className="store-cart-photo-placeholder";box.textContent="📦";card.append(box);
    }
    const info=document.createElement("div");
    const title=document.createElement("h3");title.textContent=String(product.title||product.id||"Товар");
    const qty=document.createElement("p");qty.textContent=Number(product.quantity)+" × "+Number(product.price).toFixed(2)+" ₴";
    info.append(title,qty);card.append(info);items.append(card);
  }
  const count=cart.reduce((sum,item)=>sum+Number(item.quantity||0),0);
  const total=cart.reduce((sum,item)=>sum+Number(item.price||0)*Number(item.quantity||0),0);
  document.getElementById("checkoutCount").textContent=String(count);
  document.getElementById("checkoutTotal").textContent=total.toLocaleString("uk-UA",{minimumFractionDigits:2,maximumFractionDigits:2})+" ₴";
}
function checkoutKey(items){
  const fingerprint=JSON.stringify(items);
  try{
    const previous=JSON.parse(sessionStorage.getItem("pult:checkout-draft")||"null");
    if(previous?.fingerprint===fingerprint&&/^[a-f0-9-]{36}$/i.test(previous.key||""))return previous.key;
    const key=crypto.randomUUID();
    sessionStorage.setItem("pult:checkout-draft",JSON.stringify({fingerprint,key}));
    return key;
  }catch(error){return crypto.randomUUID();}
}
async function submitOrder(event){
  event.preventDefault();
  const cart=getCart(),form=document.getElementById("checkoutForm");
  const status=document.getElementById("checkoutStatus");
  const button=document.querySelector(".checkout-button");
  const message=(text,error=true)=>{
    if(status){status.textContent=text;status.dataset.error=String(error);}
  };
  if(!cart.length){message("Кошик порожній");return;}
  const items=cart.map(p=>({sku:String(p.sku||p.id),quantity:Number(p.quantity)}));
  const fields=new FormData(form);
  const customer={
    name:String(fields.get("customer_name")||"").trim(),
    phone:String(fields.get("customer_phone")||"").trim(),
    email:String(fields.get("customer_email")||"").trim(),
    delivery_method:String(fields.get("delivery_method")||""),
    delivery_city:String(fields.get("delivery_city")||"").trim(),
    delivery_branch:String(fields.get("delivery_branch")||"").trim(),
    comment:String(fields.get("customer_comment")||"").trim()
  };
  if(button)button.disabled=true;
  message("Зберігаємо замовлення…",false);
  try{
    const response=await fetch("/api/orders",{
      method:"POST",credentials:"same-origin",
      headers:{"Content-Type":"application/json","Accept":"application/json"},
      body:JSON.stringify({items,customer,client_request_key:checkoutKey(items)})
    });
    const data=await response.json();
    if(!response.ok){
      if(response.status===401)throw Error("Увійдіть у свій акаунт, щоб оформити замовлення: /login.html");
      throw Error(data.message||"Не вдалося оформити замовлення");
    }
    if(!Number.isSafeInteger(Number(data.id)))throw Error("Відповідь сервера не містить номера замовлення");
    try{
      sessionStorage.setItem("pult:last-order",JSON.stringify({id:Number(data.id),total:data.total}));
      sessionStorage.removeItem("pult:checkout-draft");
    }catch(error){}
    localStorage.removeItem(CART_KEY);
    updateCartCounter();
    window.location.assign("/thanks.html?order="+encodeURIComponent(data.id));
  }catch(error){
    message(error.message||"Не вдалося оформити замовлення");
  }finally{
    if(button)button.disabled=getCart().length===0;
  }
}
