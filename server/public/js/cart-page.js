"use strict";
document.addEventListener("DOMContentLoaded",()=>{
  renderCart();
  const checkout=document.getElementById("checkoutButton");
  if(checkout)checkout.addEventListener("click",()=>{
    if(!getCart().length){alert("Кошик порожній");return;}
    location.href="checkout.html";
  });
});
function renderCart(){
  const products=getCart();
  const root=document.getElementById("cartItems");
  const empty=document.getElementById("emptyCart");
  if(!root||!empty)return;
  root.replaceChildren();
  empty.classList.toggle("hidden",products.length>0);
  function node(tag,text,cls){
    const e=document.createElement(tag);
    if(text!==undefined)e.textContent=String(text??"");
    if(cls)e.className=cls;
    return e;
  }
  for(const p of products){
    const card=node("article",undefined,"cart-item");
    const photo=typeof p.image==="string"&&/^\/?(?:img|png)\/[a-zA-Z0-9/_-]+\.(png|jpe?g|webp|avif)$/i.test(p.image)?p.image:"";
    if(photo){
      const image=node("img");
      image.src=photo;image.alt=p.title||"Товар";image.loading="lazy";
      card.append(image);
    }else card.append(node("div","📦","store-cart-photo-placeholder"));
    const info=node("div",undefined,"cart-info");
    info.append(node("h3",p.title||p.id));
    const price=node("div",Number(p.price||0).toFixed(2)+" ₴","cart-price");
    const controls=node("div",undefined,"cart-controls");
    const quantities=node("div",undefined,"quantity-box");
    for(const [label,amount] of [["−",-1],["+",1]]){
      if(amount===1)quantities.append(node("span",p.quantity,"quantity-value"));
      const button=node("button",label,"quantity-btn");
      button.type="button";
      button.setAttribute("aria-label",(amount===1?"Збільшити":"Зменшити")+" кількість "+(p.title||"товару"));
      button.addEventListener("click",()=>{
        changeQuantity(p.id,amount);
        renderCart();updateCartCounter();
      });
      quantities.append(button);
    }
    const remove=node("button","Видалити","remove-btn");
    remove.type="button";
    remove.addEventListener("click",()=>{
      removeFromCart(p.id);
      renderCart();updateCartCounter();
    });
    controls.append(quantities,remove);
    info.append(price,controls);
    card.append(info);
    root.append(card);
  }
  updateSummary();
}
function updateSummary(){
  const products=getCart();
  const count=products.reduce((sum,p)=>sum+Number(p.quantity||0),0);
  const total=products.reduce((sum,p)=>sum+Number(p.price||0)*Number(p.quantity||0),0);
  const countEl=document.getElementById("summaryCount");
  const totalEl=document.getElementById("summaryPrice");
  if(countEl)countEl.textContent=String(count);
  if(totalEl)totalEl.textContent=total.toFixed(2)+" ₴";
}
