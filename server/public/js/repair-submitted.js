"use strict";
document.addEventListener("DOMContentLoaded",()=>{
  const $=id=>document.getElementById(id);
  const t=key=>window.PultShippingI18n?.t(key)||key;
  const params=new URLSearchParams(location.hash.slice(1));
  const codeFromHash=params.get("code")||"";
  const validCode=value=>/^RP-[A-F0-9]{24,32}$/.test(value);
  let stored=null;
  try{
    const value=JSON.parse(sessionStorage.getItem("pult:last-repair")||"null");
    if(value && typeof value==="object" && validCode(value.code))stored=value;
  }catch(error){/* Private browsing may disable session storage. */}
  const hashId=Number(params.get("id"));
  const storedMatch=stored&&(!validCode(codeFromHash)||stored.code===codeFromHash);
  const info=storedMatch?stored:{
    id:Number.isSafeInteger(hashId)&&hashId>0?hashId:null,
    code:validCode(codeFromHash)?codeFromHash:"",
    shipping:params.get("shipping")==="1"
  };
  const code=validCode(info.code)?info.code:"";
  const message=$("submittedDeliveryMessage");
  const warning=$("submittedWarning");
  const recipientPanel=$("submittedRecipient");
  const refresh=$("submittedRefresh");
  const copy=$("submittedCopy");
  const codeNode=$("submittedTrackingCode");
  const track=$("submittedTrackLink");

  function setMessage(key){
    message.textContent=t(key);
    message.dataset.key=key;
  }
  function refreshLang(){
    if(codeNode)codeNode.textContent=code||t("submit.noCode");
    if(copy)copy.disabled=!code;
    if(track)track.href=code?"/track.html?code="+encodeURIComponent(code):"/track.html";
    const key=message.dataset.key;
    if(key)setMessage(key);
  }
  function text(id,value){const element=$(id);if(element)element.textContent=String(value??"");}
  async function loadInstructions(){
    if(!info.shipping){
      recipientPanel.hidden=true;
      warning.hidden=false;
      warning.textContent=t("submit.noDelivery");
      refresh.hidden=true;
      setMessage("submit.noDeliveryContact");
      return;
    }
    warning.hidden=false;
    warning.textContent=t("submit.wait");
    recipientPanel.hidden=true;
    if(!Number.isSafeInteger(Number(info.id))||Number(info.id)<1){
      setMessage("submit.guest");
      return;
    }
    refresh.disabled=true;
    try{
      // This endpoint checks the actual authenticated repair OWNER.
      // Do not fetch or display global physical-person recipient settings.
      const response=await fetch("/api/shipping/mine",{credentials:"same-origin",headers:{"Accept":"application/json"}});
      if(response.status===401||response.status===403){
        setMessage("submit.guest");
        return;
      }
      if(!response.ok){setMessage("submit.notReady");return;}
      const payload=await response.json();
      const repair=(Array.isArray(payload.repairs)?payload.repairs:[])
        .find(item=>Number(item.id)===Number(info.id)&&item.tracking_code===code);
      if(!repair){
        setMessage("submit.guest");
        return;
      }
      if(repair.send_to){
        text("submittedRecipientName",repair.send_to.recipient_name);
        text("submittedRecipientPhone",repair.send_to.recipient_phone);
        text("submittedRecipientCity",repair.send_to.city);
        text("submittedRecipientBranch",repair.send_to.warehouse);
        recipientPanel.hidden=false;
        warning.hidden=true;
        setMessage("submit.ready");
      }else{
        setMessage("submit.pending");
      }
    }catch(error){
      setMessage("submit.notReady");
    }finally{
      refresh.disabled=false;
    }
  }
  copy?.addEventListener("click",async()=>{
    if(!code)return;
    try{
      await navigator.clipboard.writeText(code);
      $("submittedCopyFeedback").textContent=t("submit.copied");
    }catch(error){
      $("submittedCopyFeedback").textContent=t("submit.copyError");
    }
  });
  refresh?.addEventListener("click",loadInstructions);
  window.addEventListener("pult:language-changed",()=>{
    refreshLang();
    if(warning&&!warning.hidden)warning.textContent=t(info.shipping?"submit.wait":"submit.noDelivery");
  });
  refreshLang();
  loadInstructions();
});
