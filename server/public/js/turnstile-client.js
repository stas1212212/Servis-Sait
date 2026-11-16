"use strict";
// Shared Cloudflare Turnstile helper for repair, register and password reset.
// Sitekey is public; secret remains on the server.
(function(){
  let scriptPromise;
  function scriptReady(){
    if(window.turnstile)return Promise.resolve();
    if(scriptPromise)return scriptPromise;
    scriptPromise=new Promise((resolve,reject)=>{
      const script=document.createElement("script");
      script.src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async=true;script.defer=true;
      script.onload=()=>window.turnstile?resolve():reject(Error("Не вдалося відкрити перевірку Cloudflare."));
      script.onerror=()=>reject(Error("Cloudflare Turnstile недоступний. Перевірте інтернет або блокувальник скриптів."));
      document.head.append(script);
    });
    return scriptPromise;
  }
  async function mount(container,action){
    const response=await fetch("/api/security/turnstile",{credentials:"same-origin",cache:"no-store"});
    if(!response.ok)throw Error("Неможливо перевірити налаштування захисту форми.");
    const config=await response.json();
    if(!config.enabled)return {enabled:false,token:()=>"",reset:()=>{}};
    if(!config.sitekey)throw Error("Ключ Cloudflare Turnstile відсутній.");
    container.classList.add("pult-turnstile");
    const title=document.createElement("p");
    title.className="pult-turnstile-heading";
    title.textContent="Перевірка безпеки PULT+";
    const target=document.createElement("div");
    target.className="pult-turnstile-widget";
    container.append(title,target);
    await scriptReady();
    const id=window.turnstile.render(target,{
      sitekey:config.sitekey,action,theme:"auto",size:"flexible"
    });
    if(id===undefined)throw Error("Не вдалося завантажити перевірку проти ботів.");
    return {
      enabled:true,
      token:()=>window.turnstile.getResponse(id)||"",
      reset:()=>window.turnstile.reset(id)
    };
  }
  window.PultTurnstile={mount};
})();
