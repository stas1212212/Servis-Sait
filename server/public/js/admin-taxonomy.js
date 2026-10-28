"use strict";
document.addEventListener("DOMContentLoaded",()=>{
  const tab=document.getElementById("adminProductsTab");
  const status=document.getElementById("storeTaxonomyStatus");
  const categoriesRoot=document.getElementById("storeCategoryList");
  const brandsRoot=document.getElementById("storeBrandList");
  const categoryForm=document.getElementById("storeCategoryForm");
  const brandForm=document.getElementById("storeBrandForm");
  if(!tab||!categoriesRoot||!brandsRoot)return;
  let categories=[],brands=[],selectedCategory=null,selectedBrand=null;
  const el=(tag,content,cls)=>{
    const item=document.createElement(tag);
    if(content!==undefined)item.textContent=String(content??"");
    if(cls)item.className=cls;
    return item;
  };
  function message(text,error=false){
    status.textContent=text;
    status.dataset.state=error?"error":"ok";
  }
  async function api(path,options){
    const response=await fetch("/api/store-taxonomy/admin"+path,{credentials:"same-origin",...options});
    const data=await response.json();
    if(!response.ok)throw new Error(data.message||"Помилка завантаження довідника");
    return data;
  }
  const request=body=>({method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
  function formValues(form,fields){
    const data=new FormData(form),object={};
    for(const field of fields)object[field]=String(data.get(field)||"").trim();
    object.is_active=form.elements.namedItem("is_active").checked;
    return object;
  }
  function resetCategory(){
    selectedCategory=null;
    categoryForm.reset();
    categoryForm.elements.namedItem("slug").readOnly=false;
    document.getElementById("storeCategoryFormTitle").textContent="Нова категорія";
  }
  function editCategory(item){
    selectedCategory=item.slug;
    categoryForm.reset();
    for(const field of ["slug","name_uk","name_en","name_ru","icon","sort_order"])
      categoryForm.elements.namedItem(field).value=item[field]??"";
    categoryForm.elements.namedItem("slug").readOnly=true;
    categoryForm.elements.namedItem("is_active").checked=item.is_active;
    document.getElementById("storeCategoryFormTitle").textContent="Редагувати: "+item.name_uk;
    categoryForm.scrollIntoView({block:"nearest",behavior:"smooth"});
  }
  function resetBrand(){
    selectedBrand=null;
    brandForm.reset();
    document.getElementById("storeBrandFormTitle").textContent="Новий бренд";
  }
  function editBrand(item){
    selectedBrand=item.id;
    brandForm.reset();
    brandForm.elements.namedItem("name").value=item.name;
    brandForm.elements.namedItem("is_active").checked=item.is_active;
    document.getElementById("storeBrandFormTitle").textContent="Редагувати: "+item.name;
    brandForm.scrollIntoView({block:"nearest",behavior:"smooth"});
  }
  function categoryValues(item){return {
    name_uk:item.name_uk,name_en:item.name_en,name_ru:item.name_ru,
    icon:item.icon,sort_order:Number(item.sort_order),is_active:item.is_active
  };}
  async function updateCategory(item,updated) {
    await api("/categories/"+encodeURIComponent(item.slug),request(updated));
    message("Категорію оновлено. Пов’язані товари не видалені.");
    await load();
  }
  async function updateBrand(item,updated) {
    await api("/brands/"+item.id,request(updated));
    message("Бренд оновлено. SKU, ціни та кількість товарів збережено.");
    await load();
  }
  function row(name,code,enabled,onEdit,onToggle) {
    const item=el("div",undefined,"store-taxonomy-row");
    if(!enabled)item.classList.add("store-taxonomy-disabled");
    const info=el("span",name);
    info.append(el("small",code+(enabled?" · активна":" · прихована")));
    const actions=el("div",undefined,"store-taxonomy-row-actions");
    const edit=el("button","Редагувати");
    edit.type="button";edit.addEventListener("click",onEdit);
    const toggle=el("button",enabled?"Приховати":"Показати");
    toggle.type="button";
    toggle.addEventListener("click",async()=>{
      toggle.disabled=true;
      try{await onToggle();}
      catch(error){message(error.message,true);toggle.disabled=false;}
    });
    actions.append(edit,toggle);
    item.append(info,actions);
    return item;
  }
  function render(){
    categoriesRoot.replaceChildren();
    brandsRoot.replaceChildren();
    for(const item of categories){
      categoriesRoot.append(row(item.icon+" "+item.name_uk,item.slug,item.is_active,
        ()=>editCategory(item),
        ()=>updateCategory(item,{...categoryValues(item),is_active:!item.is_active})));
    }
    for(const item of brands){
      brandsRoot.append(row("🏷️ "+item.name,"ID "+item.id,item.is_active,
        ()=>editBrand(item),
        ()=>updateBrand(item,{name:item.name,is_active:!item.is_active})));
    }
    if(!categories.length)categoriesRoot.textContent="Категорії не знайдено.";
    if(!brands.length)brandsRoot.textContent="Брендів ще немає.";
  }
  async function load(){
    try{
      const data=await api("");
      categories=Array.isArray(data.categories)?data.categories:[];
      brands=Array.isArray(data.brands)?data.brands:[];
      render();
      window.dispatchEvent(new CustomEvent("pult:taxonomy-admin-updated",{detail:{categories,brands}}));
    }catch(error){message(error.message,true);}
  }
  categoryForm.addEventListener("submit",async event=>{
    event.preventDefault();
    const button=categoryForm.querySelector('button[type="submit"]');
    button.disabled=true;
    const body=formValues(categoryForm,["slug","name_uk","name_en","name_ru","icon","sort_order"]);
    body.sort_order=Number(body.sort_order);
    const slug=body.slug;
    if(selectedCategory)delete body.slug;
    try{
      await api(selectedCategory?"/categories/"+encodeURIComponent(selectedCategory):"/categories",
        {...request(body),method:selectedCategory?"PUT":"POST"});
      resetCategory();
      message("Категорію збережено.");
      await load();
    }catch(error){message(error.message,true);}
    finally{button.disabled=false;}
  });
  brandForm.addEventListener("submit",async event=>{
    event.preventDefault();
    const button=brandForm.querySelector('button[type="submit"]');
    button.disabled=true;
    const body=formValues(brandForm,["name"]);
    try{
      await api(selectedBrand?"/brands/"+selectedBrand:"/brands",
        {...request(body),method:selectedBrand?"PUT":"POST"});
      resetBrand();
      message("Бренд збережено.");
      await load();
    }catch(error){message(error.message,true);}
    finally{button.disabled=false;}
  });
  document.getElementById("storeCategoryCancel").addEventListener("click",resetCategory);
  document.getElementById("storeBrandCancel").addEventListener("click",resetBrand);
  tab.addEventListener("click",load);
});