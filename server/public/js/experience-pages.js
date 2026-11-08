"use strict";
document.addEventListener("DOMContentLoaded", () => {
  const $=id=>document.getElementById(id);
  const announce=(element,message,ok)=>{
    if(!element)return;
    element.textContent=message;element.dataset.state=ok?"ok":"error";
  };
  async function json(url,options) {
    const response=await fetch(url,{credentials:"same-origin",...options});
    const data=await response.json();
    if(!response.ok)throw new Error(data.message||"Сервіс тимчасово недоступний");
    return data;
  }
  const forgot=$("forgotForm");
  if(forgot)forgot.addEventListener("submit",async event=>{
    event.preventDefault();
    const button=forgot.querySelector('button[type="submit"]');
    button.disabled=true;
    try{
      const data=await json("/api/experience/password/forgot",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({email:forgot.elements.email.value.trim()})
      });
      announce($("forgotResult"),data.message,true);
    }catch(e){announce($("forgotResult"),e.message,false);}
    finally{button.disabled=false;}
  });

  const reset=$("resetForm");
  if(reset){
    const params=new URLSearchParams(location.hash.slice(1));
    const token=params.get("token") || new URLSearchParams(location.search).get("token");
    if(location.search||location.hash)history.replaceState(null,"",location.pathname);
    if(!token)announce($("resetResult"),"Посилання на відновлення відсутнє.",false);
    reset.addEventListener("submit",async event=>{
      event.preventDefault();
      const password=reset.elements.password.value;
      if(!token)return announce($("resetResult"),"Запитайте нове посилання.",false);
      if(password!==reset.elements.confirm.value)return announce($("resetResult"),"Паролі не збігаються.",false);
      const button=reset.querySelector('button[type="submit"]');button.disabled=true;
      try{
        const data=await json("/api/experience/password/reset",{
          method:"POST",headers:{"Content-Type":"application/json"},
          body:JSON.stringify({token,password})
        });
        announce($("resetResult"),data.message,true);
        reset.reset();
        const link=$("afterReset");if(link)link.hidden=false;
      }catch(e){announce($("resetResult"),e.message,false);}
      finally{button.disabled=false;}
    });
  }

  const track=$("trackingForm");
  if(track){
    const urlCode=new URLSearchParams(location.search).get("code");
    if(urlCode)track.elements.code.value=urlCode;
    const statuses={pending:"Заявку отримано",in_progress:"У роботі",waiting_parts:"Очікуємо запчастини",completed:"Ремонт завершено",cancelled:"Заявку скасовано"};
    track.addEventListener("submit",async event=>{
      event.preventDefault();
      const code=track.elements.code.value.trim().toUpperCase();
      try{
        const data=await json("/api/experience/track/"+encodeURIComponent(code));
        const r=data.request;
        announce($("trackingResult"),"Заявка "+r.tracking_code+" — "+(statuses[r.status]||"Статус оновлюється"),true);
      }catch(e){announce($("trackingResult"),e.message,false);}
    });
    if(urlCode)track.requestSubmit();
  }

  const reviewForm=$("reviewForm"), reviewList=$("publicReviews");
  async function loadReviews(){
    if(!reviewList)return;
    try{
      const data=await json("/api/experience/reviews");
      reviewList.replaceChildren();
      if(!data.reviews.length){reviewList.textContent="Опублікованих відгуків поки немає.";return;}
      for(const review of data.reviews){
        const article=document.createElement("article");article.className="exp-review";
        const title=document.createElement("strong");title.textContent="★".repeat(review.rating)+"☆".repeat(5-review.rating)+" · "+(review.author||"Клієнт");
        const text=document.createElement("p");text.textContent=review.comment;
        article.append(title,text);reviewList.append(article);
      }
    }catch(e){reviewList.textContent="Не вдалося завантажити відгуки.";}
  }
  loadReviews();
  if(reviewForm){
    (async()=>{
      try{
        const data=await json("/api/experience/reviews/eligible");
        const select=reviewForm.elements.request_id;
        select.replaceChildren(new Option("Оберіть завершений ремонт",""));
        data.requests.forEach(r=>select.add(new Option("№"+r.id+" — "+[r.device_type,r.brand,r.model].filter(Boolean).join(" "),r.id)));
        if(!data.requests.length)announce($("reviewResult"),"Щоб залишити відгук, увійдіть у кабінет і дочекайтеся завершення ремонту.",false);
      }catch(e){announce($("reviewResult"),"Для відгуку потрібен вхід до кабінету.",false);}
    })();
    reviewForm.addEventListener("submit",async event=>{
      event.preventDefault();
      const button=reviewForm.querySelector('button[type="submit"]');button.disabled=true;
      try{
        const data=await json("/api/experience/reviews",{method:"POST",headers:{"Content-Type":"application/json"},
          body:JSON.stringify({request_id:reviewForm.elements.request_id.value,rating:Number(reviewForm.elements.rating.value),comment:reviewForm.elements.comment.value})
        });
        announce($("reviewResult"),data.message,true);reviewForm.reset();
        const selected=reviewForm.elements.request_id;selected.querySelectorAll('option:not([value=""])').forEach(o=>o.remove());
      }catch(e){announce($("reviewResult"),e.message,false);}
      finally{button.disabled=false;}
    });
  }
});