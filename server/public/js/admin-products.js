"use strict";
document.addEventListener("DOMContentLoaded",()=>{
  const tab=document.getElementById("adminProductsTab");
  const panel=document.getElementById("adminProductsPanel");
  const list=document.getElementById("adminProductsList");
  const form=document.getElementById("adminProductForm");
  const search=document.getElementById("adminProductsSearch");
  const sort=document.getElementById("adminProductsSort");
  const activeTab=document.getElementById("adminProductViewActive");
  const archiveTab=document.getElementById("adminProductViewArchive");
  const activeCount=document.getElementById("adminProductCountActive");
  const archiveCount=document.getElementById("adminProductCountArchive");
  const hint=document.getElementById("adminProductsHint");
  const message=document.getElementById("adminMessage");
  if(!tab||!form)return;

  let products=[],currentId=null,categories=[],brands=[],currentView="active",searchTimer=null,loadSerial=0;
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
  function sortedProducts(items){
    const order=sort.value;
    const list=[...items];
    if(order==="name")list.sort((a,b)=>String(a.name||"").localeCompare(String(b.name||""),"uk")||a.id-b.id);
    else if(order==="stock")list.sort((a,b)=>Number(a.stock)-Number(b.stock)||b.id-a.id);
    else if(order==="price")list.sort((a,b)=>Number(a.price)-Number(b.price)||b.id-a.id);
    else list.sort((a,b)=>b.id-a.id);
    return list;
  }
  function render(){
    list.replaceChildren();
    const query=search.value.trim().toLocaleLowerCase();
    const filtered=products.filter(p=>[p.name,p.sku,p.brand,p.model,p.category,categoryTitle(p.category)]
      .some(x=>String(x??"").toLocaleLowerCase().includes(query)));
    const active=sortedProducts(filtered.filter(p=>p.is_active));
    const archived=sortedProducts(filtered.filter(p=>!p.is_active));
    activeCount.textContent="("+active.length+")";
    archiveCount.textContent="("+archived.length+")";
    for(const [status,button]of [["active",activeTab],["archive",archiveTab]]){
      const selected=currentView===status;
      button.classList.toggle("active",selected);
      button.setAttribute("aria-pressed",String(selected));
    }
    hint.textContent=query
      ?"Результати пошуку в обох розділах: у продажу — "+active.length+", в архіві — "+archived.length+"."
      :currentView==="archive"
        ?"Архів: приховані товари не продаються, але зберігаються для обліку. Їх можна відновити або видалити, якщо вони ніколи не замовлялися."
        :"У продажу: приховайте сумнівні позиції, щоб вони зникли з магазину. Знайти їх можна в архіві або через загальний пошук.";
    const groups=query
      ?[{title:"У продажу",items:active},{title:"Архів товарів",items:archived}]
      :[{title:currentView==="active"?"У продажу":"Архів товарів",items:currentView==="active"?active:archived}];
    for(const group of groups){
      const section=el("section",undefined,"admin-product-group");
      const title=el("h3",group.title+" · "+group.items.length,"admin-product-group-title");
      section.append(title);
      if(!group.items.length){
        section.append(el("p",query?"За цим запитом збігів немає.":currentView==="archive"?"Архів порожній.":"Немає активних товарів.","admin-product-empty"));
        list.append(section);
        continue;
      }
      for(const product of group.items){
        const card=el("article",undefined,"admin-request admin-product-card");
        const heading=el("h4",product.name);
        const category=el("p","📁 "+categoryTitle(product.category)+" · "+(product.brand||"Без бренду"));
        const info=el("p","SKU "+product.sku+" · "+Number(product.price).toFixed(2)+" грн · Залишок: "+product.stock+" шт.");
        const inventory=el("p",product.stock>0?"● Є на складі":"● Немає на складі");
        inventory.className="store-stock-state "+(product.stock>0?"in-stock":"out-of-stock");
        const visibility=el("span",product.is_active?"У продажу":"В архіві","admin-product-status "+(product.is_active?"is-active":"is-archived"));
        const edit=el("button","Редагувати / залишок","admin-save");
        edit.type="button";
        edit.addEventListener("click",()=>openEditor(product));
        const toggle=el("button",product.is_active?"Перемістити в архів":"Повернути в продаж","admin-product-toggle");
        toggle.type="button";
        toggle.addEventListener("click",async()=>{
          toggle.disabled=true;
          try{
            await json("/api/admin/products/"+product.id+"/visibility",{
              method:"PATCH",headers:{"Content-Type":"application/json"},
              body:JSON.stringify({is_active:!product.is_active})
            });
            show(product.is_active?"Товар перенесено в архів.":"Товар повернено в продаж.");
            await load();
          }catch(error){show(error.message,true);}
          finally{toggle.disabled=false;}
        });
        const buttons=el("div",undefined,"admin-request-actions");
        buttons.append(edit,toggle);
        if(!product.is_active){
          const remove=el("button","Видалити назавжди","admin-product-delete");
          remove.type="button";
          remove.title="Лише якщо товар ніколи не входив до замовлень";
          remove.addEventListener("click",async()=>{
            const given=window.prompt("Незворотне видалення товару «"+product.name+"».\nВведіть його SKU точно: "+product.sku);
            if(given===null)return;
            if(given!==product.sku){show("SKU не збігається. Товар залишився в архіві.",true);return;}
            remove.disabled=true;
            try{
              await json("/api/admin/products/"+product.id,{
                method:"DELETE",headers:{"Content-Type":"application/json"},
                body:JSON.stringify({confirm_sku:given})
              });
              show("Товар остаточно видалено. Історія замовлень не змінена.");
              await load();
            }catch(error){show(error.message,true);}
            finally{remove.disabled=false;}
          });
          buttons.append(remove);
        }
        card.append(heading,visibility,category,info,inventory,buttons);
        section.append(card);
      }
      list.append(section);
    }
    if(products.length>=500){
      list.prepend(el("p","Показано до 500 товарів. Використовуйте пошук вище, щоб знайти інші позиції у всій базі.","admin-product-limit"));
    }
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
    const request=++loadSerial;
    const query=search.value.trim();
    try{
      const data=await json("/api/admin/products"+(query?"?search="+encodeURIComponent(query):""));
      if(request!==loadSerial||query!==search.value.trim())return;
      products=Array.isArray(data.products)?data.products:[];
      render();
    }catch(error){
      if(request===loadSerial)show(error.message,true);
    }
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
  for(const [button,view]of [[activeTab,"active"],[archiveTab,"archive"]]){
    button.addEventListener("click",()=>{currentView=view;render();});
  }
  sort.addEventListener("change",render);
  search.addEventListener("input",()=>{
    clearTimeout(searchTimer);
    hint.textContent="Шукаємо товари в обох розділах…";
    searchTimer=setTimeout(load,180);
  });
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
