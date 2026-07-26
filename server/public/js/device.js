// ======================
// PHONE
// ======================

if (document.getElementById("phoneRepairForm")) {

    // Весь код телефонов
    // от document.addEventListener...
    // до конца
document.addEventListener("DOMContentLoaded", () => {

    const phoneImage = document.getElementById("phoneImage");
    const brandTitle = document.getElementById("brandTitle");
    const selectedBrand = document.getElementById("selectedBrand");

    const brandButtons = document.querySelectorAll(".brand");

    const models = {
        "Samsung": [
            "Galaxy S24 Ultra",
            "Galaxy S24+",
            "Galaxy S23 Ultra",
            "Galaxy A55",
            "Galaxy A35"
        ],

        "Apple": [
            "iPhone 16 Pro Max",
            "iPhone 16 Pro",
            "iPhone 15 Pro Max",
            "iPhone 15",
            "iPhone 14"
        ],

        "Xiaomi": [
            "Xiaomi 14 Ultra",
            "Xiaomi 14",
            "Redmi Note 13",
            "POCO X6",
            "POCO F6"
        ],

        "Google": [
            "Pixel 9 Pro",
            "Pixel 9",
            "Pixel 8 Pro",
            "Pixel 8"
        ],

        "Motorola": [
            "Edge 50 Ultra",
            "Edge 50 Pro",
            "Moto G85",
            "Moto G54"
        ],

        "Huawei": [
            "Pura 70 Ultra",
            "P60 Pro",
            "Nova 12",
            "Mate 60"
        ],

        "Інший": [
            "Введіть модель вручну"
        ]
    };

    const modelInput = document.querySelector('input[name="model"]');

    function updateModelPlaceholder(brand) {

        if (!models[brand]) return;

        modelInput.placeholder = models[brand][0];

    }

    brandButtons.forEach(button => {

        button.addEventListener("click", () => {

            brandButtons.forEach(btn => {
                btn.classList.remove("active");
            });

            button.classList.add("active");

            const brand = button.dataset.brand;
            const image = button.dataset.image;

            phoneImage.style.opacity = "0";

            setTimeout(() => {

                phoneImage.src = image;

                phoneImage.style.opacity = "1";

            }, 180);

            brandTitle.textContent = brand;

            selectedBrand.value = brand;

            updateModelPlaceholder(brand);

        });

    });

    updateModelPlaceholder("Samsung");

    const form = document.getElementById("phoneRepairForm");

    form.addEventListener("submit", function (e) {

        e.preventDefault();

        const formData = {

            name: form.name.value,
            phone: form.phone.value,
            email: form.email.value,
            brand: selectedBrand.value,
            model: form.model.value,
            problem: form.problem.value,
            history: form.history.value,
            repairType: form.repair.value

        };

        console.log(formData);

        // Здесь позже будет отправка на сервер:
        // fetch('/api/orders', {...})

        window.location.href = "thanks.html";

    });

});
    
}

// ======================
// LAPTOP
// ======================

if (document.getElementById("laptopRepairForm")) {

    // Здесь будет практически тот же код,
    // только с ASUS, Lenovo, MSI и т.д.
document.addEventListener("DOMContentLoaded", () => {

    const laptopImage = document.getElementById("laptopImage");
    const brandTitle = document.getElementById("brandTitle");
    const selectedBrand = document.getElementById("selectedBrand");

    const brandButtons = document.querySelectorAll(".brand");

    const models = {

        "ASUS": [
            "ROG Zephyrus G16",
            "ROG Strix G18",
            "TUF Gaming A15",
            "Vivobook Pro 15",
            "Zenbook 14 OLED"
        ],

        "Lenovo": [
            "LOQ 15IAX9",
            "Legion Pro 5",
            "Legion 7",
            "IdeaPad Gaming 3",
            "ThinkPad X1 Carbon"
        ],

        "HP": [
            "Victus 16",
            "OMEN 16",
            "Pavilion 15",
            "ProBook 450",
            "EliteBook 840"
        ],

        "Dell": [
            "XPS 15",
            "Inspiron 15",
            "Latitude 5540",
            "Alienware M18",
            "Precision 7680"
        ],

        "Acer": [
            "Nitro V15",
            "Nitro 5",
            "Predator Helios Neo",
            "Swift Go 14",
            "Aspire 7"
        ],

        "MSI": [
            "Raider GE78 HX",
            "Katana 17",
            "Stealth 16 AI",
            "Cyborg 15",
            "Vector GP68"
        ],

        "Apple": [
            "MacBook Air M2",
            "MacBook Air M3",
            "MacBook Pro 14",
            "MacBook Pro 16"
        ],

        "Інший": [
            "Введіть модель вручну"
        ]

    };

    const modelInput = document.querySelector('input[name="model"]');

    function updateModelPlaceholder(brand) {

        if (!models[brand]) return;

        modelInput.placeholder = models[brand][0];

    }

    brandButtons.forEach(button => {

        button.addEventListener("click", () => {

            brandButtons.forEach(btn => {
                btn.classList.remove("active");
            });

            button.classList.add("active");

            const brand = button.dataset.brand;
            const image = button.dataset.image;

            laptopImage.style.opacity = "0";

            setTimeout(() => {

                laptopImage.src = image;
                laptopImage.style.opacity = "1";

            }, 180);

            brandTitle.textContent = brand;
            selectedBrand.value = brand;

            updateModelPlaceholder(brand);

        });

    });

    updateModelPlaceholder("ASUS");

    const form = document.getElementById("laptopRepairForm");

    form.addEventListener("submit", function (e) {

        e.preventDefault();

        const formData = {

            name: form.name.value,
            phone: form.phone.value,
            email: form.email.value,

            brand: selectedBrand.value,

            model: form.model.value,

            problem: form.problem.value,

            history: form.history.value,

            repairType: form.repair.value

        };

        console.log(formData);

        // Здесь позже будет отправка на сервер
        // fetch('/api/orders', {...})

        window.location.href = "thanks.html";

    });

});

}

document.addEventListener("DOMContentLoaded", () => {

    const tvImage = document.getElementById("tvImage");
    const brandTitle = document.getElementById("brandTitle");
    const selectedBrand = document.getElementById("selectedBrand");

    const brandButtons = document.querySelectorAll(".brand");

    const models = {

        "Samsung": [
            "UE55DU7100",
            "QN90D",
            "S90D OLED",
            "CU8000",
            "Q60D"
        ],

        "LG": [
            "OLED C4",
            "OLED G4",
            "QNED86",
            "NanoCell NANO81",
            "UR7800"
        ],

        "Sony": [
            "BRAVIA 9",
            "BRAVIA 8 OLED",
            "X90L",
            "X85L",
            "A80L"
        ],

        "Philips": [
            "The One",
            "OLED809",
            "PUS8919",
            "PUS8518"
        ],

        "TCL": [
            "C855",
            "C745",
            "C655",
            "P755"
        ],

        "Hisense": [
            "U8N",
            "U7N",
            "E7N",
            "A7N"
        ],

        "Інший": [
            "Введіть модель вручну"
        ]

    };

    const modelInput = document.querySelector('input[name="model"]');

    function updateModelPlaceholder(brand) {

        if (!models[brand]) return;

        modelInput.placeholder = models[brand][0];

    }

    brandButtons.forEach(button => {

        button.addEventListener("click", () => {

            brandButtons.forEach(btn => {

                btn.classList.remove("active");

            });

            button.classList.add("active");

            const brand = button.dataset.brand;
            const image = button.dataset.image;

            tvImage.style.opacity = "0";

            setTimeout(() => {

                tvImage.src = image;
                tvImage.style.opacity = "1";

            }, 180);

            brandTitle.textContent = brand;
            selectedBrand.value = brand;

            updateModelPlaceholder(brand);

        });

    });

    updateModelPlaceholder("Samsung");

    const form = document.getElementById("tvRepairForm");

    form.addEventListener("submit", function (e) {

        e.preventDefault();

        const formData = {

            name: form.name.value,
            phone: form.phone.value,
            email: form.email.value,

            brand: selectedBrand.value,

            model: form.model.value,

            type: form.type.value,

            problem: form.problem.value,

            history: form.history.value,

            repairType: form.repair.value

        };

        console.log(formData);

        // Здесь позже будет отправка на сервер
        // fetch('/api/orders', {...})

        window.location.href = "thanks.html";

    });

});

// ======================
// SPEAKER
// ======================

document.addEventListener("DOMContentLoaded", () => {

    const speakerImage = document.getElementById("speakerImage");
    const brandTitle = document.getElementById("brandTitle");
    const selectedBrand = document.getElementById("selectedBrand");

    const brandButtons = document.querySelectorAll(".brand");

    const models = {

        "JBL": [
            "Charge 5",
            "Charge 6",
            "Flip 6",
            "Flip 7",
            "Boombox 3",
            "Xtreme 4",
            "PartyBox 110"
        ],

        "Sony": [
            "SRS-XB23",
            "SRS-XB43",
            "ULT Field 7",
            "XV800",
            "HT-S400"
        ],

        "Marshall": [
            "Acton III",
            "Stanmore III",
            "Woburn III",
            "Emberton II",
            "Middleton"
        ],

        "Bose": [
            "SoundLink Flex",
            "SoundLink Revolve+",
            "Smart Soundbar 900",
            "Portable Smart Speaker"
        ],

        "LG": [
            "XBOOM Go XG7",
            "XBOOM 360",
            "Sound Bar S80QR",
            "Sound Bar SC9"
        ],

        "Samsung": [
            "HW-Q990D",
            "HW-Q800D",
            "MX-ST50B",
            "Sound Tower MX-T70"
        ],

        "Інший": [
            "Введіть модель вручну"
        ]

    };

    const modelInput = document.querySelector('input[name="model"]');

    function updatePlaceholder(brand) {

        if (!models[brand]) return;

        modelInput.placeholder = models[brand][0];

    }

    brandButtons.forEach(button => {

        button.addEventListener("click", () => {

            brandButtons.forEach(btn => btn.classList.remove("active"));

            button.classList.add("active");

            const brand = button.dataset.brand;
            const image = button.dataset.image;

            speakerImage.style.opacity = "0";

            setTimeout(() => {

                speakerImage.src = image;
                speakerImage.style.opacity = "1";

            }, 180);

            brandTitle.textContent = brand;
            selectedBrand.value = brand;

            updatePlaceholder(brand);

        });

    });

    updatePlaceholder("JBL");

    const form = document.getElementById("speakerRepairForm");

    form.addEventListener("submit", function(e){

        e.preventDefault();

        const formData = {

            name: form.name.value,
            phone: form.phone.value,
            email: form.email.value,

            brand: selectedBrand.value,

            model: form.model.value,

            device: form.device.value,

            problem: form.problem.value,

            history: form.history.value,

            repair: form.repair.value,

            equipment: form.equipment.value,

            beforeRepair: form.beforeRepair.value,

            contact: form.contact.value,

            comment: form.comment.value

        };

        console.log(formData);

        // Здесь позже будет отправка на сервер
        // fetch("/api/orders", {...})

        window.location.href = "thanks.html";

    });

});