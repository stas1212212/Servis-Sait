// PULT+ lightweight translations. Extend data-i18n keys as pages are migrated.
const PULT_I18N = {
 uk: {"nav.home":"Головна","nav.shop":"🛍 Магазин","nav.phone":"Телефони","nav.laptop":"Ноутбуки","nav.tv":"Телевізори","nav.audio":"Акустика","nav.account":"Особистий кабінет","nav.cart":"Кошик","footer.about":"Сервіс електроніки та магазин пультів","footer.links":"Навігація","home.title":"Ремонт електроніки та магазин пультів","home.subtitle":"Зручний сервіс: обирайте пульти в каталозі або залишайте заявку на ремонт техніки.","home.shop":"Перейти до магазину","home.repair":"Замовити ремонт","home.services":"Наші послуги","home.pults":"Пульти","home.pultsText":"Пульти для різних пристроїв та допомога з підбором.","home.laptop":"Ноутбуки","home.laptopText":"Діагностика, чистка та ремонт ноутбуків.","home.tv":"Телевізори","home.tvText":"Діагностика та ремонт телевізорів.","home.phone":"Телефони","home.phoneText":"Діагностика та ремонт смартфонів.","home.tablet":"Планшети","home.tabletText":"Ремонт планшетів.","home.audio":"Акустика","home.audioText":"Діагностика та ремонт акустики.","home.how":"Як це працює","home.step1":"Оберіть товар або послугу","home.step2":"Оформіть замовлення чи заявку","home.step3":"Відстежуйте статус в кабінеті"},
 ru: {"nav.home":"Главная","nav.shop":"🛍 Магазин","nav.phone":"Телефоны","nav.laptop":"Ноутбуки","nav.tv":"Телевизоры","nav.audio":"Акустика","nav.account":"Личный кабинет","nav.cart":"Корзина","footer.about":"Сервис электроники и магазин пультов","footer.links":"Навигация","home.title":"Ремонт электроники и магазин пультов","home.subtitle":"Удобный сервис: выбирайте пульты в каталоге или оставляйте заявку на ремонт техники.","home.shop":"Перейти в магазин","home.repair":"Заказать ремонт","home.services":"Наши услуги","home.pults":"Пульты","home.pultsText":"Пульты для разных устройств и помощь с подбором.","home.laptop":"Ноутбуки","home.laptopText":"Диагностика, чистка и ремонт ноутбуков.","home.tv":"Телевизоры","home.tvText":"Диагностика и ремонт телевизоров.","home.phone":"Телефоны","home.phoneText":"Диагностика и ремонт смартфонов.","home.tablet":"Планшеты","home.tabletText":"Ремонт планшетов.","home.audio":"Акустика","home.audioText":"Диагностика и ремонт акустики.","home.how":"Как это работает","home.step1":"Выберите товар или услугу","home.step2":"Оформите заказ или заявку","home.step3":"Отслеживайте статус в кабинете"},
 en: {"nav.home":"Home","nav.shop":"🛍 Shop","nav.phone":"Phones","nav.laptop":"Laptops","nav.tv":"TVs","nav.audio":"Audio","nav.account":"My account","nav.cart":"Cart","footer.about":"Electronics repair and remote control store","footer.links":"Navigation","home.title":"Electronics repair & remote control shop","home.subtitle":"Shop for remote controls or request a repair for your device.","home.shop":"Browse shop","home.repair":"Request repair","home.services":"Our services","home.pults":"Remote controls","home.pultsText":"Remotes for many devices and help choosing the right one.","home.laptop":"Laptops","home.laptopText":"Laptop diagnostics, cleaning and repair.","home.tv":"Televisions","home.tvText":"TV diagnostics and repair.","home.phone":"Phones","home.phoneText":"Smartphone diagnostics and repair.","home.tablet":"Tablets","home.tabletText":"Tablet repair.","home.audio":"Audio","home.audioText":"Audio diagnostics and repair.","home.how":"How it works","home.step1":"Choose a product or service","home.step2":"Place an order or repair request","home.step3":"Track its status in your account"}
};
function applySiteLanguage() {
 const lang = ["uk","ru","en"].includes(localStorage.getItem("pultplus-language")) ? localStorage.getItem("pultplus-language") : "uk";
 document.documentElement.lang = lang;
 document.querySelectorAll("[data-i18n]").forEach(el => {
   const translated = PULT_I18N[lang][el.dataset.i18n];
   if (translated) el.textContent = translated;
 });
 document.querySelectorAll("[data-lang]").forEach(el => {
   el.setAttribute("aria-pressed",String(el.dataset.lang === lang));
   if (!el.dataset.langBound) {
     el.dataset.langBound = "true";
     el.addEventListener("click", () => {
       localStorage.setItem("pultplus-language",el.dataset.lang);
       applySiteLanguage();
     });
   }
 });
 if(typeof window!=="undefined")window.dispatchEvent(new Event("pult:language-changed"));
}
