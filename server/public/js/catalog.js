"use strict";
let allProducts=[];
let catalogCategories=[];
let catalogBrands=[];
let activeCategory="";
const text=key=>window.PultCatalogI18n?.t(key)||key;
const lang=()=>window.PultCatalogI18n?.lang()||"uk";
const fallbackTypes={
  tv:{slug:"tv",name_uk:"Пульти для телевізорів",name_en:"TV remotes",name_ru:"Пульты для телевизоров",icon:"📺"},
  universal:{slug:"universal",name_uk:"Універсальні пульти",name_en:"Universal remotes",name_ru:"Универсальные пульты",icon:"🎮"},
  receiver:{slug:"receiver",name_uk:"Пульти для ресиверів",name_en:"Receiver remotes",name_ru:"Пульты для ресиверов",icon:"📡"},
  tvbox:{slug:"tvbox",name_uk:"Пульти для TV Box",name_en:"TV Box remotes",name_ru:"Пульты для TV Box",icon:"📱"},
  ac:{slug:"ac",name_uk:"Пульти для кондиціонерів",name_en:"Air conditioner remotes",name_ru:"Пульты для кондиционеров",icon:"❄️"},
  audio:{slug:"audio",name_uk:"Пульти для аудіотехніки",name_en:"Audio remotes",name_ru:"Пульты для аудиотехники",icon:"🔊"},
  parts:{slug:"parts",name_uk:"Запчастини",name_en:"Spare parts",name_ru:"Запчасти",icon:"🔧"}
};
function item(tag,value,cls){
  const node=document.createElement(tag);
  if(value!==undefined)node.textContent=String(value??"");
  if(cls)node.className=cls;
  return node;
}
function categoryName(value){
  const match=catalogCategories.find(c=>c.slug===value);
  if(!match)return fallbackTypes[value]?.["name_"+lang()]||value||text("common.unknown");
  return match["name_"+lang()]||match.name_uk||match.slug;
}
function categoryIcon(value){
  return catalogCategories.find(c=>c.slug===value)?.icon||fallbackTypes[value]?.icon||"📦";
}
function imagePath(value){
  return typeof value==="string"&&/^\/?(?:img|png)\/[a-zA-Z0-9/_-]+\.(png|jpe?g|webp|avif)$/i.test(value)
    ?value:"";
}
function renderCategories(){
  const root=document.getElementById("categories");
  const select=document.getElementById("catalogCategory");
  if(!root||!select)return;
  root.replaceChildren();
  select.replaceChildren(new Option(text("filters.allCategories"),""));
  const options=[{slug:"",icon:"🛍️",name:text("categories.all")},...catalogCategories.map(c=>({...c,name:categoryName(c.slug)}))];
  for(const category of options){
    const button=item("button",undefined,"category-card");
    button.type="button";
    button.dataset.cat=category.slug;
    button.setAttribute("aria-pressed",String(activeCategory===category.slug));
    if(activeCategory===category.slug)button.classList.add("active");
    button.append(item("span",category.icon,"store-cat-icon"),item("span",category.name));
    if(category.slug){
      const count=Number(category.product_count??allProducts.filter(p=>p.category===category.slug).length);
      button.append(item("small",count+" "+text("categories.count")));
      select.add(new Option(category.name,category.slug));
    }
    button.addEventListener("click",()=>{
      activeCategory=category.slug;
      select.value=activeCategory;
      applyCatalogFilters();
    });
    root.append(button);
  }
  select.value=activeCategory;
}
function brandOptions(){
  const select=document.getElementById("catalogBrand");
  if(!select)return;
  const old=select.value;
  const activeBrandNames=new Set(catalogBrands.map(b=>typeof b==="string"?b:b.name));
  const present=new Set(allProducts.filter(p=>!activeCategory||p.category===activeCategory).map(p=>p.brand).filter(Boolean));
  const available=[...present].filter(name=>activeBrandNames.has(name)).sort((a,b)=>a.localeCompare(b,lang()));
  select.replaceChildren(new Option(text("filters.allBrands"),""));
  for(const name of available)select.add(new Option(name,name));
  select.value=available.includes(old)?old:"";
}
function productCard(product){
  const card=item("article",undefined,"product-card store-product");
  const details=item("a",undefined,"store-product-media");
  details.href="product.html?sku="+encodeURIComponent(product.sku);
  details.setAttribute("aria-label",text("products.details")+": "+product.name);
  const path=imagePath(product.image_url);
  const placeholder=()=>{
    details.replaceChildren(item("div",categoryIcon(product.category)+" "+text("products.photo"),"product-image-placeholder"));
  };
  if(path){
    const image=item("img");
    image.src=path;
    image.alt=product.name;
    image.loading="lazy";
    image.addEventListener("error",placeholder,{once:true});
    details.append(image);
  }else placeholder();
  const body=item("div",undefined,"product-body");
  const meta=item("p",undefined,"store-product-category");
  meta.append(item("span",categoryIcon(product.category)+" "+categoryName(product.category)));
  const title=item("h3");
  const titleLink=item("a",product.name);
  titleLink.href=details.href;
  title.append(titleLink);
  const brand=item("p",product.brand||text("product.unbranded"),"store-product-brand");
  const description=item("p",product.description||"","store-product-description");
  const price=item("div",Number(product.price).toLocaleString(lang()==="en"?"en-GB":"uk-UA",{minimumFractionDigits:2,maximumFractionDigits:2})+" ₴","price");
  const availability=item("p",product.stock>0?text("products.stock")+": "+product.stock:text("products.out"),"store-product-availability");
  if(product.stock<=0)availability.classList.add("unavailable");
  const controls=item("div",undefined,"store-product-actions");
  const button=item("button",product.stock>0?text("products.buy"):text("products.out"),"buy-product-btn");
  button.type="button";
  button.disabled=product.stock<=0;
  button.addEventListener("click",()=>{
    if(product.stock<=0||typeof addToCart!=="function")return;
    addToCart({id:product.sku,title:product.name,price:Number(product.price),image:path,sku:product.sku});
    button.textContent=text("products.added");
    button.disabled=true;
  });
  const link=item("a",text("products.details"),"store-details-link");
  link.href=details.href;
  controls.append(button,link);
  body.append(meta,title,brand,description,availability,price,controls);
  card.append(details,body);
  return card;
}
function renderProducts(products){
  const root=document.getElementById("productList"),counter=document.getElementById("productCount");
  if(!root)return;
  root.replaceChildren();
  if(counter)counter.textContent=products.length+" "+text("products.count");
  if(!products.length){root.append(item("p",text("products.empty"),"store-empty-products"));return;}
  for(const product of products)root.append(productCard(product));
}
function applyCatalogFilters(){
  const query=(document.getElementById("catalogQuery")?.value||"").trim().toLocaleLowerCase();
  activeCategory=document.getElementById("catalogCategory")?.value??activeCategory;
  document.querySelectorAll("#categories .category-card").forEach(btn=>{
    btn.classList.toggle("active",btn.dataset.cat===activeCategory);
    btn.setAttribute("aria-pressed",String(btn.dataset.cat===activeCategory));
  });
  brandOptions();
  const selectedBrand=document.getElementById("catalogBrand")?.value||"";
  const inStock=document.getElementById("catalogStock")?.checked===true;
  const sort=document.getElementById("catalogSort")?.value||"name";
  const shown=allProducts.filter(product=>{
    const words=[product.name,product.sku,product.brand,product.model,product.description,
      ...(Array.isArray(product.compatible)?product.compatible:[])].join(" ").toLocaleLowerCase();
    return (!query||words.includes(query))&&(!activeCategory||product.category===activeCategory)&&
      (!selectedBrand||product.brand===selectedBrand)&&(!inStock||product.stock>0);
  });
  shown.sort((a,b)=>sort==="price_asc"?a.price-b.price:
    sort==="price_desc"?b.price-a.price:
    sort==="stock"?b.stock-a.stock:
    String(a.name).localeCompare(String(b.name),lang()));
  renderProducts(shown);
}
async function loadCatalog(){
  const status=document.getElementById("catalogStatus");
  if(status)status.textContent=text("products.loading");
  try{
    const [productsResponse,taxonomyResponse]=await Promise.all([
      fetch("/api/products",{credentials:"same-origin"}),
      fetch("/api/store-taxonomy/options",{credentials:"same-origin"})
    ]);
    if(!productsResponse.ok)throw Error("No products");
    const payload=await productsResponse.json();
    allProducts=(Array.isArray(payload.products)?payload.products:[]).map(p=>({
      id:p.id,sku:String(p.sku||""),name:String(p.name||""),
      brand:p.brand||"",model:p.model||"",description:p.description||"",
      price:Number(p.price),stock:Number(p.stock),category:p.category||"tv",
      image_url:p.image_url||"",compatible:Array.isArray(p.compatible)?p.compatible:[]
    }));
    let categoriesData=null;
    if(taxonomyResponse.ok)categoriesData=await taxonomyResponse.json();
    if(categoriesData){
      catalogCategories=Array.isArray(categoriesData.categories)?categoriesData.categories:[];
      catalogBrands=Array.isArray(categoriesData.brands)?categoriesData.brands.map(b=>b.name):[];
    }else{
      // Storefront remains readable until admin applies optional taxonomy migration.
      catalogCategories=[...new Set(allProducts.map(p=>p.category))].map(slug=>fallbackTypes[slug]||{
        slug,name_uk:slug,name_en:slug,name_ru:slug,icon:"📦"
      });
      catalogBrands=[...new Set(allProducts.map(p=>p.brand).filter(Boolean))];
    }
    renderCategories();
    brandOptions();
    applyCatalogFilters();
    if(status)status.textContent="";
  }catch(error){
    console.error("Storefront catalog loading failed:",error);
    if(status)status.textContent=text("products.error");
  }
}
document.addEventListener("DOMContentLoaded",()=>{
  for(const id of ["catalogQuery","catalogCategory","catalogBrand","catalogStock","catalogSort"]){
    const element=document.getElementById(id);
    if(element)element.addEventListener(id==="catalogQuery"?"input":"change",applyCatalogFilters);
  }
  document.getElementById("catalogSearchButton")?.addEventListener("click",applyCatalogFilters);
  window.addEventListener("pult:language-changed",()=>{
    renderCategories();
    brandOptions();
    applyCatalogFilters();
  });
  loadCatalog();
});
