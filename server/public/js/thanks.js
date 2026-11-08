
"use strict";
document.addEventListener("DOMContentLoaded",()=>{
  const requested=Number(new URLSearchParams(location.search).get("order"));
  let own=null;
  try{own=JSON.parse(sessionStorage.getItem("pult:last-order")||"null")}catch(error){}
  if(Number.isSafeInteger(requested)&&requested>0&&own&&own.id===requested){
    document.getElementById("thanksOrderNumber").textContent="Ваше замовлення №"+requested;
  }
});
