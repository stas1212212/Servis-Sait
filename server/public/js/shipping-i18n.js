"use strict";
// All shipping UI labels use this dictionary. Ukrainian is the default, with
// English and Russian available from the existing global language selector.
(function(){
  const translations={
    "client.eyebrow":["PULT+ · НОВА ПОШТА","PULT+ · NOVA POSHTA","PULT+ · НОВАЯ ПОЧТА"],
    "client.title":["Доставка моєї техніки","My repair deliveries","Доставка моей техники"],
    "client.subtitle":["Вкажіть вхідну ТТН, оберіть відділення для повернення та відстежуйте обидва відправлення.","Register your incoming tracking number, choose a return branch and view both shipments.","Укажите входящую ТТН, выберите отделение для возврата и отслеживайте обе отправки."],
    "client.notice":["Не надсилайте пристрій до підтвердження реквізитів для вашої заявки. Після підтвердження ПІБ, телефон, місто та відділення з’являться нижче.","Do not send your device until the destination details for your request are approved. The recipient name, phone, city and branch will then appear below.","Не отправляйте устройство до подтверждения реквизитов для вашей заявки. После подтверждения ФИО, телефон, город и отделение появятся ниже."],
    "client.loading":["Завантажуємо заявки…","Loading repair requests…","Загружаем заявки…"],
    "client.guest":["Заявку подано без входу? Зв’яжіться з менеджером, щоб отримати підтверджені реквізити та передати ТТН. Перевірка статусу ремонту доступна за кодом RP-….","Applied without signing in? Contact the manager for confirmed recipient details and to submit your tracking number. Repair status is available with your RP-… code.","Подали заявку без входа? Свяжитесь с менеджером, чтобы получить подтверждённые реквизиты и передать ТТН. Статус ремонта доступен по коду RP-…."],
    "client.repairCodeLink":["кодом заявки RP-…","your RP-… repair code","коду заявки RP-…"],
    "client.noRequests":["Заявок на ремонт поки немає.","No repair requests yet.","Заявок на ремонт пока нет."],
    "client.repair":["Ремонт №","Repair #","Ремонт №"],
    "client.device":["Пристрій","Device","Устройство"],
    "client.repairCode":["Код ремонту","Repair code","Код ремонта"],
    "client.receivedAt":["Прийомка","Device received","Приёмка"],
    "client.incoming":["📦 До сервісу","📦 To the repair center","📦 В сервис"],
    "client.outgoing":["🚚 Назад клієнту","🚚 Back to the customer","🚚 Обратно клиенту"],
    "client.status":["Статус","Status","Статус"],
    "client.ttn":["ТТН","Tracking number","ТТН"],
    "client.city":["Місто","City","Город"],
    "client.branch":["Відділення","Branch","Отделение"],
    "client.empty":["Не вказано","Not provided","Не указано"],
    "client.noWaybill":["Немає накладної","No waybill yet","Нет накладной"],
    "client.notSet":["Ще не вказано","Not provided yet","Ещё не указано"],
    "client.checkCarrier":["Перевірити ТТН на сайті Нової пошти","Check on Nova Poshta's website","Проверить ТТН на сайте Новой почты"],
    "client.incomingTitle":["Додати вхідну ТТН","Add incoming tracking number","Добавить входящую ТТН"],
    "client.returnTitle":["Відділення для повернення","Return delivery branch","Отделение для возврата"],
    "client.changeTtn":["Зміна ТТН","Changing tracking number","Изменение ТТН"],
    "client.contactManager":["Вже обробляється сервісом — зверніться до менеджера","Already being processed; contact the manager","Уже обрабатывается сервисом — обратитесь к менеджеру"],
    "client.ttnField":["Номер експрес-накладної (14 цифр)","Tracking number (14 digits)","Номер экспресс-накладной (14 цифр)"],
    "client.changeBranch":["Зміна відділення","Changing the branch","Изменение отделения"],
    "client.sentAlready":["Накладну вже оформлено — зверніться до менеджера","The waybill is already registered; contact the manager","Накладная уже оформлена — обратитесь к менеджеру"],
    "client.save":["Зберегти","Save","Сохранить"],
    "client.saveError":["Не вдалося зберегти","Could not save","Не удалось сохранить"],
    "client.loadError":["Не вдалося завантажити доставку","Could not load delivery information","Не удалось загрузить доставку"],
    "client.instructionsTitle":["Куди відправити пристрій","Where to send your device","Куда отправить устройство"],
    "client.instructionsPending":["Реквізити ще не підтверджено менеджером. НЕ надсилайте пристрій. Дочекайтеся підтвердження або зв’яжіться з сервісом.","The manager has not approved the recipient details yet. DO NOT send your device. Wait for approval or contact us.","Менеджер ещё не подтвердил реквизиты. НЕ отправляйте устройство. Дождитесь подтверждения или свяжитесь с сервисом."],
    "client.instructionsReady":["Реквізити підтверджено для цієї заявки. Оформлюйте посилку на зазначену фізичну особу та вкажіть номер заявки в коментарі до відправлення.","These details are approved for this repair. Address the parcel to the named individual and include the repair number in the shipping comment.","Реквизиты подтверждены для этой заявки. Оформляйте посылку на указанное физическое лицо и укажите номер заявки в комментарии к отправке."],
    "client.recipientName":["ПІБ одержувача","Recipient name","ФИО получателя"],
    "client.recipientPhone":["Телефон одержувача","Recipient phone","Телефон получателя"],
    "client.copyDetails":["Скопіювати реквізити","Copy recipient details","Скопировать реквизиты"],
    "client.copied":["Реквізити скопійовано","Details copied","Реквизиты скопированы"],
    "client.copyFailed":["Не вдалося скопіювати","Could not copy","Не удалось скопировать"],
    "client.noDelivery":["Доставку Новою поштою не обрано для цієї заявки. Узгодьте надсилання з менеджером.","Nova Poshta delivery is not configured for this request. Contact the manager.","Доставка Новой почтой не выбрана для этой заявки. Согласуйте отправку с менеджером."],
    "status.not_sent":["Не відправлено","Not shipped","Не отправлено"],
    "status.registered":["ТТН зареєстровано","Tracking number registered","ТТН зарегистрирована"],
    "status.in_transit":["У дорозі (за даними сервісу)","In transit (manual update)","В пути (по данным сервиса)"],
    "status.at_branch":["У відділенні (за даними сервісу)","At branch (manual update)","В отделении (по данным сервиса)"],
    "status.received":["Отримано","Received","Получено"],
    "status.cancelled":["Скасовано","Cancelled","Отменено"],
    "admin.eyebrow":["PULT+ · АДМІНІСТРАТОР","PULT+ · ADMIN","PULT+ · АДМИНИСТРАТОР"],
    "admin.title":["Логістика Нової пошти","Nova Poshta logistics","Логистика Новой почты"],
    "admin.subtitle":["Ручний облік ТТН, приймання техніки та зворотного відправлення. Інтеграції з API перевізника поки немає.","Manual tracking numbers, device intake and returns. Carrier API integration is not yet enabled.","Ручной учёт ТТН, приёмка устройств и обратная отправка. Интеграции с API перевозчика пока нет."],
    "admin.loading":["Перевіряємо доступ…","Checking access…","Проверяем доступ…"],
    "admin.recipientTitle":["Одержувач посилок — фізична особа","Parcel recipient — individual","Получатель посылок — физическое лицо"],
    "admin.recipientHelp":["Заповніть реальні реквізити. Вони доступні лише адміністраторам. Після погодження окремої заявки натисніть «Підтвердити реквізити» біля неї, щоб клієнт побачив точний пункт призначення.","Enter the actual recipient details. They are admin-only. After approving an individual request, click 'Approve recipient details' next to it so the customer can see where to ship.","Введите реальные реквизиты. Они доступны только администраторам. После согласования конкретной заявки нажмите «Подтвердить реквизиты», чтобы клиент увидел адрес отправки."],
    "admin.name":["ПІБ одержувача","Recipient full name","ФИО получателя"],
    "admin.phone":["Телефон одержувача","Recipient phone","Телефон получателя"],
    "admin.city":["Місто","City","Город"],
    "admin.branch":["Відділення Нової пошти (№ або адреса)","Nova Poshta branch (number or address)","Отделение Новой почты (номер или адрес)"],
    "admin.saveRecipient":["Зберегти реквізити","Save recipient details","Сохранить реквизиты"],
    "admin.requests":["Заявки та відправлення","Repairs and shipments","Заявки и отправления"],
    "admin.search":["Пошук за номером заявки, клієнтом чи ТТН","Search by repair number, customer or tracking number","Поиск по номеру заявки, клиенту или ТТН"],
    "admin.searchPlaceholder":["Знайти заявку…","Find a repair…","Найти заявку…"],
    "admin.back":["← До заявок","← Back to repairs","← К заявкам"],
    "admin.noRequests":["Немає відповідних заявок.","No matching repairs.","Нет подходящих заявок."],
    "admin.repair":["Ремонт №","Repair #","Ремонт №"],
    "admin.customer":["Клієнт","Customer","Клиент"],
    "admin.device":["Пристрій","Device","Устройство"],
    "admin.repairStatus":["Статус ремонту","Repair status","Статус ремонта"],
    "admin.incoming":["📦 Вхідна доставка","📦 Incoming shipment","📦 Входящая доставка"],
    "admin.outgoing":["🚚 Зворотна доставка","🚚 Return shipment","🚚 Обратная доставка"],
    "admin.deliveryStatus":["Статус доставки","Shipment status","Статус доставки"],
    "admin.arrived":["Пристрій прийнято, дані ТТН зафіксовано","Device received, tracking number recorded","Устройство принято, ТТН зафиксирована"],
    "admin.ttn":["ТТН (14 цифр)","Tracking number (14 digits)","ТТН (14 цифр)"],
    "admin.fromCity":["Місто відправлення","Sender city","Город отправления"],
    "admin.toCity":["Місто отримання","Destination city","Город получения"],
    "admin.fromBranch":["Відділення відправника","Sender branch","Отделение отправителя"],
    "admin.toBranch":["Відділення клієнта","Customer branch","Отделение клиента"],
    "admin.returnName":["ПІБ клієнта-одержувача","Return recipient name","ФИО клиента-получателя"],
    "admin.returnPhone":["Телефон клієнта-одержувача","Return recipient phone","Телефон клиента-получателя"],
    "admin.saveShipment":["Зберегти доставку","Save shipment","Сохранить доставку"],
    "admin.intake":["🛠 Акт приймання пристрою","🛠 Device intake report","🛠 Акт приёмки устройства"],
    "admin.date":["Дата приймання","Received on","Дата приёмки"],
    "admin.condition":["Зовнішній стан пристрою","Device condition","Внешнее состояние устройства"],
    "admin.accessories":["Комплектація (що передав клієнт)","Included accessories","Комплектация (что передал клиент)"],
    "admin.serial":["Серійний номер (за наявності)","Serial number (if available)","Серийный номер (при наличии)"],
    "admin.notes":["Зауваження","Notes","Примечания"],
    "admin.updateIntake":["Оновити акт приймання","Update intake report","Обновить акт приёмки"],
    "admin.acceptDevice":["Прийняти пристрій","Accept device","Принять устройство"],
    "admin.instructionsTitle":["Реквізити відправки для клієнта","Shipping destination for this customer","Реквизиты отправки для клиента"],
    "admin.instructionsPending":["Ще не підтверджено — клієнт не бачить особисті реквізити одержувача.","Not approved — the customer cannot see the private recipient details.","Ещё не подтверждено — клиент не видит личные реквизиты получателя."],
    "admin.instructionsReady":["Підтверджено — клієнт бачить реквізити цієї заявки у своєму кабінеті.","Approved — the customer can see this repair's details in their account.","Подтверждено — клиент видит реквизиты этой заявки в своём кабинете."],
    "admin.approve":["Підтвердити реквізити","Approve recipient details","Подтвердить реквизиты"],
    "admin.revoke":["Відкликати підтвердження","Revoke approval","Отозвать подтверждение"],
    "admin.copy":["Скопіювати для повідомлення","Copy for customer message","Скопировать для сообщения"],
    "admin.copyHint":["Для гостя без акаунта надішліть підтверджені дані особисто після перевірки заявки.","For guest repairs, share the confirmed details privately after verifying the request.","Для гостя без аккаунта отправьте подтверждённые данные лично после проверки заявки."],
    "admin.shippingNotSelected":["Немає доставки Новою поштою у цій заявці.","Nova Poshta delivery was not selected for this repair.","Доставка Новой почтой не выбрана для этой заявки."],
    "admin.migrationMissing":["Для підтвердження виконайте оновлений shipping-setup.sql у pgAdmin.","Run the updated shipping-setup.sql in pgAdmin before approving.","Для подтверждения выполните обновлённый shipping-setup.sql в pgAdmin."],
    "admin.apiError":["Помилка сервера","Server error","Ошибка сервера"],
    "admin.saveError":["Не вдалося зберегти","Could not save","Не удалось сохранить"],
    "admin.copied":["Реквізити скопійовано","Details copied","Реквизиты скопированы"],
    "admin.copyFailed":["Не вдалося скопіювати реквізити","Could not copy the details","Не удалось скопировать реквизиты"],
    "form.legend":["Доставка Новою поштою","Nova Poshta delivery","Доставка Новой почтой"],
    "form.enable":["Надіслати пристрій у PULT+ через відділення Нової пошти","Send my device to PULT+ via a Nova Poshta branch","Отправить устройство в PULT+ через отделение Новой почты"],
    "form.warning":["Після підтвердження заявки менеджером точні реквізити з’являться в кабінеті доставки. До цього не відправляйте пристрій.","Once the manager approves your repair, the destination details will appear in your delivery account. Do not ship before approval.","После подтверждения заявки менеджером точные реквизиты появятся в кабинете доставки. До этого не отправляйте устройство."],
    "form.returnCity":["Місто для зворотної доставки","Return city","Город обратной доставки"],
    "form.returnBranch":["Відділення Нової пошти для повернення","Nova Poshta return branch","Отделение Новой почты для возврата"],
    "form.note":["Після відправлення введіть ТТН у кабінеті. Якщо подаєте заявку без акаунта — отримайте адресу й передайте ТТН менеджеру особисто.","After shipping, enter your tracking number in your account. For guest requests, obtain the address and share your tracking number directly with the manager.","После отправки введите ТТН в кабинете. Если подали заявку без аккаунта — получите адрес и передайте ТТН менеджеру лично."],
    "form.returnCityPlaceholder":["Наприклад, Київ","e.g. Kyiv","Например, Киев"],
    "form.returnBranchPlaceholder":["Номер або адреса відділення","Branch number or address","Номер или адрес отделения"]
  };
  const codes={uk:0,en:1,ru:2};
  function language(){
    try{
      const stored=localStorage.getItem("pultplus-language");
      return Object.prototype.hasOwnProperty.call(codes,stored)?stored:"uk";
    }catch(error){return "uk";}
  }
  function t(key) {
    const options=translations[key];
    return options?options[codes[language()]]:key;
  }
  function apply(){
    document.querySelectorAll("[data-shipping-i18n]").forEach(el=>{
      el.textContent=t(el.dataset.shippingI18n);
    });
    document.querySelectorAll("[data-shipping-placeholder]").forEach(el=>{
      el.setAttribute("placeholder",t(el.dataset.shippingPlaceholder));
    });
  }
  window.PultShippingI18n={t,language,apply,translations};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",apply);
  else apply();
  window.addEventListener("pult:language-changed",apply);
})();
