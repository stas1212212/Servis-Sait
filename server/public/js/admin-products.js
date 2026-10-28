"use strict";
document.addEventListener("DOMContentLoaded",()=>{
  const tab=document.getElementById("adminProductsTab");
  const panel=document.getElementById("adminProductsPanel");
  const list=document.getElementById("adminProductsList");
  const form=document.getElementById("adminProductForm");
  const search=document.getElementById("adminProductsSearch");
  const message=document.getElementById("adminMessage");
  if(!tab||!form)return;

  let products=[],currentId=null,categories=[],brands=[];
  function el(tag,value,cls){
    const node=document.createElement(tag);
    if(value!==undefined)node.textContent=String(value??"");
    if(cls)node.className=cls;
    return node;
  }
  function show(value,error=false){
    message.textContent=value;
    message.className=error?"admin-message-error":"admin-message-ok";
  }
  async function json(url,options){
    const response=await fetch(url,{credentials:"same-origin",...options});
    const data=await response.json();
    if(!response.ok)throw new Error(data.message||"Не вдалося зберегти");
    return data;
  }
  function chooseOptions(select,items,blank,previous){
    select.replaceChildren(new Option(blank,""));
    for(const [value,label] of items) select.add(new Option(label,String(value)));
    if(previous!=null){
      if(!Array.from(select.options).some(o=>o.value===String(previous))&&previous!==""){
        const opt=new Option(String(previous)+" (приховано або неактивно)",String(previous));
        opt.disabled=true;
        select.add(opt);
      }
      select.value=String(previous);
    }
  }
  function refreshSelectors(){
    const category=form.elements.namedItem("category"),brand=form.elements.namedItem("brand");
    const oldCategory=category.value,oldBrand=brand.value;
    chooseOptions(category,categories.filter(x=>x.is_active).map(x=>[x.slug,x.icon+" "+x.name_uk]),"Оберіть категорію",oldCategory);
    chooseOptions(brand,brands.filter(x=>x.is_active).map(x=>[x.name,x.name]),"Без бренду",oldBrand);
  }
  window.addEventListener("pult:taxonomy-admin-updated",event=>{
    categories=event.detail.categories||[];
    brands=event.detail.brands||[];
    refreshSelectors();
  });
  function categoryTitle(slug){
    return categories.find(c=>c.slug===slug)?.name_uk||slug||"Без категорії";
  }
  function render(){
    list.replaceChildren();
    const query=search.value.trim().toLocaleLowerCase();
    const selected=products.filter(p=>[p.name,p.sku,p.brand,p.model,p.category,categoryTitle(p.category)]
      .some(x=>String(x??"").toLocaleLowerCase().includes(query)));
    for(const product of selected){
      const card=el("article",undefined,"admin-request");
      const heading=el("h3",product.name);
      const category=el("p","📁 "+categoryTitle(product.category)+" · "+(product.brand||"Без бренду"));
      const info=el("p","SKU "+product.sku+" · "+Number(product.price).toFixed(2)+" грн · Залишок: "+product.stock+" шт.");
      const inventory=el("p",product.stock>0?"● Є на складі":"● Немає на складі");
      inventory.className="store-stock-state "+(product.stock>0?"in-stock":"out-of-stock");
      const visibility=el("p",product.is_active?"Показується в магазині":"Прихований");
      const edit=el("button","Редагувати / залишок","admin-save");
      edit.type="button";
      edit.addEventListener("click",()=>openEditor(product));
      const toggle=el("button",product.is_active?"Приховати товар":"Показати товар","admin-product-toggle");
      toggle.type="button";
      toggle.addEventListener("click",async()=>{
        toggle.disabled=true;
        try{
          await json("/api/admin/products/"+product.id,{
            method:"PUT",headers:{"Content-Type":"application/json"},
            body:JSON.stringify({...product,is_active:!product.is_active})
          });
          show(product.is_active?"Товар приховано.":"Товар знову доступний для показу.");
          await load();
        }catch(error){show(error.message,true);}
        finally{toggle.disabled=false;}
      });
      const buttons=el("div",undefined,"admin-request-actions");
      buttons.append(edit,toggle);
      card.append(heading,category,info,inventory,visibility,buttons);
      list.append(card);
    }
    if(!selected.length)list.append(el("p","Товарів не знайдено. Додайте позицію після налаштування категорій і брендів."));
  }
  function openEditor(product){
    currentId=product?.id||null;
    form.reset();
    document.getElementById("adminProductFormTitle").textContent=product?"Редагувати товар":"Новий товар";
    refreshSelectors();
    if(product){
      for(const key of ["sku","name","model","description","price","stock","image_url"]){
        const input=form.elements.namedItem(key);
        if(input&&product[key]!=null)input.value=product[key];
      }
      const category=form.elements.namedItem("category");
      category.value=product.category||"";
      if(category.value!==(product.category||"")&&product.category)
        chooseOptions(category,[...categories.filter(c=>c.is_active).map(c=>[c.slug,c.name_uk]),[product.category,categoryTitle(product.category)+" (прихована)"]],"Оберіть категорію",product.category);
      const brand=form.elements.namedItem("brand");
      brand.value=product.brand||"";
      if(product.brand&&brand.value!==product.brand)
        chooseOptions(brand,[...brands.filter(b=>b.is_active).map(b=>[b.name,b.name]),[product.brand,product.brand+" (прихований)"]],"Без бренду",product.brand);
    }
    form.elements.namedItem("is_active").checked=product?!!product.is_active:true;
    form.hidden=false;
    form.scrollIntoView({block:"start",behavior:"smooth"});
  }
  async function load(){
    try{
      const data=await json("/api/admin/products");
      products=Array.isArray(data.products)?data.products:[];
      render();
    }catch(error){show(error.message,true);}
  }
  tab.addEventListener("click",()=>{
    document.getElementById("adminRepairsPanel").hidden=true;
    document.getElementById("adminOrdersPanel").hidden=true;
    panel.hidden=false;
    for(const id of ["adminRepairsTab","adminOrdersTab"]){
      const other=document.getElementById(id);
      other.classList.remove("active");
      other.setAttribute("aria-pressed","false");
    }
    tab.classList.add("active");
    tab.setAttribute("aria-pressed","true");
    load();
  });
  search.addEventListener("input",render);
  document.getElementById("adminProductsNew").addEventListener("click",()=>openEditor(null));
  document.getElementById("adminProductCancel").addEventListener("click",()=>{form.hidden=true;currentId=null;});
  form.addEventListener("submit",async event=>{
    event.preventDefault();
    const button=form.querySelector('button[type="submit"]');
    button.disabled=true;
    const payload=Object.fromEntries(new FormData(form).entries());
    payload.is_active=form.elements.namedItem("is_active").checked;
    try{
      await json(currentId?"/api/admin/products/"+currentId:"/api/admin/products",{
        method:currentId?"PUT":"POST",
        headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)
      });
      form.hidden=true;
      currentId=null;
      show("Товар збережено. Залишки, ціна та категорія оновлені.");
      await load();
    }catch(error){show(error.message,true);}
    finally{button.disabled=false;}
  });
});
