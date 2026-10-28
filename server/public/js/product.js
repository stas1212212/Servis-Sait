"use strict";
document.addEventListener("DOMContentLoaded",async()=>{
  const params=new URLSearchParams(location.search);
  const value=params.get("sku")||params.get("id");
  const t=key=>window.PultCatalogI18n?.t(key)||key;
  const $=id=>document.getElementById(id);
  const errorArea=$("productError");
  const buy=document.querySelector(".buy-btn");
  const photos=$("productImage");
  const safeImage=value=>typeof value==="string"&&/^\/?(?:img|png)\/[a-zA-Z0-9/_-]+\.(webp|png|jpe?g|avif)$/i.test(value)?value:"";
  const write=(id,value)=>{const node=$(id);if(node)node.textContent=String(value??"");};
  function list(id,values){
    const node=$(id);
    if(!node)return;
    node.replaceChildren();
    const items=Array.isArray(values)?values.filter(v=>typeof v==="string"&&v.trim()):[];
    if(!items.length){const empty=document.createElement("li");empty.textContent=t(id==="productCompatible"?"product.noCompatible":"product.noDetails");node.append(empty);}
    else for(const v of items){
      const item=document.createElement("li");item.textContent=v;node.append(item);
    }
  }
  let product=null;
  function render(){
    if(!product)return;
    const name=product.name||product.sku;
    document.title=name+" | PULT+";
    write("productBrand",product.brand||t("product.unbranded"));
    write("productTitle",name);
    const price=Number(product.price)||0;
    write("productPrice",price.toLocaleString(window.PultCatalogI18n?.lang()==="en"?"en-GB":"uk-UA",{minimumFractionDigits:2,maximumFractionDigits:2})+" ₴");
    write("productDescription",product.description||"");
    write("productDescriptionLong",product.description||"");
    write("productRating",Number(product.rating)>0?"★".repeat(Math.min(5,Math.floor(Number(product.rating)))):"");
    write("productCategory",product.category||"");
    write("productStock",(Number(product.stock)>0?t("product.stock")+": "+product.stock:t("product.out")));
    list("productFeatures",product.features);
    list("productCompatible",product.compatible);
    const imageUrl=safeImage(product.image_url);
    if(photos){
      if(imageUrl){
        photos.src=imageUrl;
        photos.alt=name;
        photos.hidden=false;
        photos.onerror=()=>{
          photos.hidden=true;
          const container=photos.parentElement;
          if(container&&!container.querySelector(".store-product-photo-fallback")){
            const fallback=document.createElement("div");
            fallback.className="store-product-photo-fallback";
            fallback.textContent="📦 "+t("product.photo");
            container.append(fallback);
          }
        };
      }else{
        photos.hidden=true;
        const container=photos.parentElement;
        if(container&&!container.querySelector(".store-product-photo-fallback")){
          const fallback=document.createElement("div");
          fallback.className="store-product-photo-fallback";
          fallback.textContent="📦 "+t("product.photo");
          container.append(fallback);
        }
      }
    }
    if(buy){
      buy.disabled=Number(product.stock)<=0;
      buy.textContent=buy.disabled?t("product.out"):t("product.buy");
    }
  }
  if(buy)buy.addEventListener("click",()=>{
    if(!product||Number(product.stock)<=0||typeof addToCart!=="function")return;
    const photo=safeImage(product.image_url);
    addToCart({id:product.sku,sku:product.sku,title:product.name,price:Number(product.price),image:photo});
    buy.textContent=t("product.added");
    buy.disabled=true;
  });
  window.addEventListener("pult:language-changed",render);
  if(!value){
    if(errorArea)errorArea.textContent=t("product.notFound");
    if(buy)buy.disabled=true;
    return;
  }
  try{
    const endpoint=/^[0-9]+$/.test(value)?"/api/products/"+encodeURIComponent(value):"/api/products/sku/"+encodeURIComponent(value);
    const response=await fetch(endpoint,{credentials:"same-origin"});
    const data=await response.json();
    if(!response.ok)throw Error(data.message||t("product.notFound"));
    product=data.product;
    render();
    if(errorArea)errorArea.textContent="";
  }catch(error){
    if(errorArea)errorArea.textContent=error.message||t("product.error");
    if(buy)buy.disabled=true;
  }
});
