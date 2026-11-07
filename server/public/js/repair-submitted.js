"use strict";
document.addEventListener("DOMContentLoaded",()=>{
  const $=id=>document.getElementById(id);
  const t=key=>window.PultShippingI18n?.t(key)||key;
  const params=new URLSearchParams(location.hash.slice(1));
  const codeFromHash=params.get("code")||"";
  const validCode=value=>/^RP-[A-F0-9]{24,32}$/.test(value);
  const validCarrier=value=>value==="nova_poshta"||value==="ukrposhta";
  let stored=null;
  try{
    const value=JSON.parse(sessionStorage.getItem("pult:last-repair")||"null");
    if(value&&typeof value==="object"&&validCode(value.code))stored=value;
  }catch(error){}
  const hashId=Number(params.get("id"));
  const storedMatch=stored&&(!validCode(codeFromHash)||stored.code===codeFromHash);
  const info=storedMatch?stored:{
    id:Number.isSafeInteger(hashId)&&hashId>0?hashId:null,
    code:validCode(codeFromHash)?codeFromHash:"",
    shipping:params.get("shipping")==="1",
    token:null
  };
  const code=validCode(info.code)?info.code:"";
  const token=typeof info.token==="string"&&/^[a-f0-9]{64}$/.test(info.token)?info.token:null;
  const requestId=Number(info.id);
  const hasId=Number.isSafeInteger(requestId)&&requestId>0;
  const warning=$("submittedWarning"),recipient=$("submittedRecipient"),
    message=$("submittedDeliveryMessage"),selectionStatus=$("submittedCarrierStatus"),
    locationPanel=$("submittedLocation"),mapContainer=$("carrierLocationMap"),
    map=$("carrierMapFrame"),directions=$("carrierDirections"),
    refresh=$("submittedRefresh"),copy=$("submittedCopy");
  const radios=Array.from(document.querySelectorAll('input[name="repairCarrier"]'));
  let locations=[],selected=null,lastApproved=null,warningKey="submit.wait",messageKey="submit.chooseCarrier",
    selectionKey="carrier.chooseHint",busy=false,locked=false;

  function setWarning(key){
    warningKey=key;warning.hidden=false;warning.textContent=t(key);
  }
  function setMessage(key){
    messageKey=key;message.textContent=t(key);
  }
  function setSelection(key,error=false){
    selectionKey=key;
    selectionStatus.dataset.error=String(error);
    selectionStatus.textContent=t(key);
  }
  function fill(id,value){
    const node=$(id);if(node)node.textContent=String(value??"");
  }
  function requestHeaders(json=false){
    const headers={"Accept":"application/json"};
    if(token)headers["X-PULT-Delivery-Key"]=token;
    if(json)headers["Content-Type"]="application/json";
    return headers;
  }
  function saveInTab(){
    try{sessionStorage.setItem("pult:last-repair",JSON.stringify({...info,shipping:!!selected,token}));}
    catch(error){}
  }
  function locationFor(carrier){return locations.find(x=>x.carrier===carrier)||null;}
  function googleMapUrl(lat,lng){
    const url=new URL("https://www.google.com/maps");
    url.searchParams.set("q",lat+","+lng);
    url.searchParams.set("output","embed");
    return url.toString();
  }
  function directionsUrl(lat,lng){
    const url=new URL("https://www.google.com/maps/dir/");
    url.searchParams.set("api","1");
    url.searchParams.set("destination",lat+","+lng);
    return url.toString();
  }
  function previewMap(){
    // Approved instructions are a per-repair snapshot: later changes to the
    // global carrier settings must not move the customer's confirmed pin.
    const approved=lastApproved&&(lastApproved.carrier||"nova_poshta")===selected?lastApproved:null;
    const chosen=approved||locationFor(selected);
    const office=chosen?{...chosen,configured:!!(chosen.city&&chosen.warehouse&&chosen.address&&
      chosen.latitude!=null&&chosen.longitude!=null)}:null;
    locationPanel.hidden=true;
    mapContainer.hidden=true;
    map.removeAttribute("src");
    if(!selected)return;
    if(!office?.configured){
      setSelection("carrier.notConfigured",true);
      return;
    }
    const lat=Number(office.latitude),lng=Number(office.longitude);
    if(!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180){
      setSelection("carrier.notConfigured",true);
      return;
    }
    fill("carrierLocationCity",office.city);
    fill("carrierLocationBranch",office.warehouse);
    fill("carrierLocationAddress",office.address);
    const coordinates=lat.toFixed(6)+","+lng.toFixed(6);
    map.src=googleMapUrl(lat.toFixed(6),lng.toFixed(6));
    directions.href=directionsUrl(lat.toFixed(6),lng.toFixed(6));
    map.title="Google Maps — "+office.warehouse+", "+office.city;
    locationPanel.hidden=false;mapContainer.hidden=false;
  }
  function showApproved(approved){
    lastApproved=approved||null;
    recipient.hidden=true;
    if(selected&&approved&&(approved.carrier||"nova_poshta")===selected){
      fill("submittedRecipientName",approved.recipient_name);
      fill("submittedRecipientPhone",approved.recipient_phone);
      fill("submittedRecipientCity",approved.city);
      fill("submittedRecipientBranch",approved.warehouse);
      recipient.hidden=false;
      warning.hidden=true;
      setMessage("submit.ready");
    }else{
      setWarning(selected?"submit.wait":"carrier.needChoice");
      setMessage(selected?"submit.pending":"submit.chooseCarrier");
    }
  }
  function applySelected(value){
    selected=validCarrier(value)?value:null;
    for(const radio of radios)radio.checked=radio.value===selected;
    previewMap();
    showApproved(lastApproved);
  }
  async function loadLocations(){
    try{
      const response=await fetch("/api/shipping-carriers/locations",{credentials:"same-origin",headers:{"Accept":"application/json"}});
      if(!response.ok)throw Error("Unavailable");
      const data=await response.json();
      locations=Array.isArray(data.locations)?data.locations:[];
      previewMap();
    }catch(error){
      locations=[];
      if(selected)setSelection("carrier.notConfigured",true);
    }
  }
  async function loadInstructions(){
    if(!hasId){
      setMessage("submit.notReady");return;
    }
    refresh.disabled=true;
    try{
      const response=await fetch("/api/shipping-carriers/request/"+requestId,{
        credentials:"same-origin",headers:requestHeaders()});
      if(response.status===401||response.status===403){
        setMessage("carrier.noAccess");
        return;
      }
      const data=await response.json();
      if(!response.ok)throw Error(data.message||"Unavailable");
      if(data.tracking_code!==code){setMessage("carrier.noAccess");return;}
      selected=validCarrier(data.carrier)?data.carrier:null;
      for(const radio of radios)radio.checked=radio.value===selected;
      showApproved(data.send_to);
      previewMap();
      if(selected)setSelection(!locationFor(selected)?.configured?"carrier.notConfigured":data.can_change?"carrier.saved":"carrier.locked",!locationFor(selected)?.configured);
      else setSelection("carrier.chooseHint");
      locked=!data.can_change;
      radios.forEach(r=>r.disabled=locked);
      saveInTab();
    }catch(error){
      setMessage("submit.notReady");
    }finally{refresh.disabled=false;}
  }
  async function selectCarrier(carrier){
    if(!validCarrier(carrier)||busy)return;
    busy=true;radios.forEach(r=>r.disabled=true);
    applySelected(carrier);
    setSelection("carrier.saving");
    setWarning("submit.wait");
    try{
      if(!hasId)throw Error(t("carrier.noAccess"));
      const response=await fetch("/api/shipping-carriers/request/"+requestId,{
        method:"PUT",credentials:"same-origin",headers:requestHeaders(true),
        body:JSON.stringify({carrier})});
      const data=await response.json();
      if(!response.ok){
        if(response.status===503)throw Object.assign(Error(t("carrier.setupPending")),{code:"delivery_unavailable"});
        throw Error(data.message||t("carrier.saveError"));
      }
      setSelection("carrier.saved");
      saveInTab();
      await loadInstructions();
    }catch(error){
      if(error.code==="delivery_unavailable")setSelection("carrier.setupPending",true);
      else {selectionStatus.dataset.error="true";selectionStatus.textContent=error.message;}
      recipient.hidden=true;setWarning("submit.wait");
    }finally{
      busy=false;
      // loadInstructions can mark completed shipments as locked.
      radios.forEach(r=>r.disabled=locked);
    }
  }
  radios.forEach(radio=>radio.addEventListener("change",()=>{
    if(radio.checked)selectCarrier(radio.value);
  }));
  function refreshLanguage(){
    fill("submittedTrackingCode",code||t("submit.noCode"));
    copy.disabled=!code;
    $("submittedTrackLink").href=code?"/track.html?code="+encodeURIComponent(code):"/track.html";
    if(!warning.hidden)warning.textContent=t(warningKey);
    message.textContent=t(messageKey);
    // Preserve precise API errors rather than replacing with unrelated translations.
    if(selectionStatus.dataset.error!=="true")selectionStatus.textContent=t(selectionKey);
  }
  copy.addEventListener("click",async()=>{
    if(!code)return;
    try{await navigator.clipboard.writeText(code);fill("submittedCopyFeedback",t("submit.copied"));}
    catch(error){fill("submittedCopyFeedback",t("submit.copyError"));}
  });
  refresh.addEventListener("click",async()=>{
    await loadLocations();
    await loadInstructions();
  });
  window.addEventListener("pult:language-changed",refreshLanguage);
  refreshLanguage();
  setWarning("carrier.needChoice");
  setMessage("submit.chooseCarrier");
  setSelection("carrier.chooseHint");
  (async()=>{
    await loadLocations();
    await loadInstructions();
  })();
});