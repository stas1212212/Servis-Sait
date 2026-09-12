document.addEventListener("DOMContentLoaded", async () => {

const content = document.getElementById("cabinetContent");

const userName = document.getElementById("userName");
const userEmail = document.getElementById("userEmail");
const userCreatedAt = document.getElementById("userCreatedAt");
const welcomeName = document.getElementById("welcomeName");

const logoutButton = document.getElementById("logoutButton");

const editProfileButton = document.getElementById("editProfileButton");
const editProfileButtonBottom = document.getElementById("editProfileButtonBottom");


// =========================================
// ПОЛУЧЕНИЕ ТЕКУЩЕГО ПОЛЬЗОВАТЕЛЯ
// =========================================

try {

    const response = await fetch("/api/auth/me", {
        method: "GET",
        credentials: "same-origin",
        headers: {
            "Accept": "application/json"
        }
    });


    // Пользователь не авторизован
    if (!response.ok) {

        window.location.href = "/login.html";
        return;

    }


    const data = await response.json();


    if (!data.user) {

        window.location.href = "/login.html";
        return;

    }


    const user = data.user;


    // =========================================
    // ИМЯ
    // =========================================

    const name = user.name || "Користувач";

    if (welcomeName) {
        welcomeName.textContent = `Вітаємо, ${name}!`;
    }

    if (userName) {
        userName.textContent = name;
    }


    // =========================================
    // EMAIL
    // =========================================

    if (userEmail) {
        userEmail.textContent = user.email || "—";
    }


    // =========================================
    // ДАТА РЕЄСТРАЦІЇ
    // =========================================

    if (userCreatedAt) {

        if (user.created_at) {

            const date = new Date(user.created_at);

            if (!Number.isNaN(date.getTime())) {

                userCreatedAt.textContent =
                    date.toLocaleDateString("uk-UA", {
                        day: "numeric",
                        month: "long",
                        year: "numeric"
                    });

            } else {

                userCreatedAt.textContent = "—";

            }

        } else {

            userCreatedAt.textContent = "—";

        }

    }


    // =========================================
    // УСПІШНЕ ЗАВАНТАЖЕННЯ
    // =========================================

    if (content) {
        content.innerHTML = "";
    }


    // =========================================
    // ЗАМОВЛЕННЯ
    // =========================================

    await loadOrders(user);


} catch (error) {

    console.error("Cabinet error:", error);


    if (content) {

        content.innerHTML = `
            <div class="cabinet-card">
                <p>
                    Не вдалося завантажити дані акаунта.
                </p>
            </div>
        `;

    }

}


// =========================================
// ВИХІД З АКАУНТА
// =========================================

if (logoutButton) {

    logoutButton.addEventListener("click", async () => {

        const originalText = logoutButton.textContent;

        logoutButton.disabled = true;
        logoutButton.textContent = "Вихід...";


        try {

            const response = await fetch("/api/auth/logout", {

                method: "POST",

                credentials: "same-origin",

                headers: {
                    "Accept": "application/json"
                }

            });


            if (!response.ok) {
                throw new Error("Logout failed");
            }


            // Переходимо на сторінку входу
            window.location.href = "/login.html";


        } catch (error) {

            console.error("Logout error:", error);

            alert("Не вдалося вийти з акаунта");

            logoutButton.disabled = false;
            logoutButton.textContent = originalText;

        }

    });

}


// =========================================
// РЕДАГУВАННЯ ПРОФІЛЮ
// =========================================

function editProfile() {

    alert(
        "Редагування профілю ми підключимо наступним етапом."
    );

}


if (editProfileButton) {

    editProfileButton.addEventListener(
        "click",
        editProfile
    );

}


if (editProfileButtonBottom) {

    editProfileButtonBottom.addEventListener(
        "click",
        editProfile
    );

}

});
 

// =========================================
// ЗАВАНТАЖЕННЯ ЗАМОВЛЕНЬ
// =========================================

async function loadOrders(user) {

    const ordersContent =
        document.getElementById("ordersContent");


    if (!ordersContent) {
        return;
    }


    try {

        const response = await fetch(
            "/api/orders",
            {
                method: "GET",
                credentials: "same-origin",
                headers: {
                    "Accept": "application/json"
                }
            }
        );


        if (response.status === 404) {

            showEmptyOrders();

            return;

        }


        if (!response.ok) {

            showEmptyOrders();

            return;

        }


        const data = await response.json();


        // API повертає масив замовлень напряму
        const orders = Array.isArray(data)
            ? data
            : Array.isArray(data.orders)
                ? data.orders
                : [];


        if (orders.length === 0) {

            showEmptyOrders();

            return;

        }


        renderOrders(orders);


    } catch (error) {

        console.error(
            "Orders loading error:",
            error
        );

        showEmptyOrders();

    }

}

// =========================================
// ПОКАЗАТИ "ЗАМОВЛЕНЬ НЕМАЄ"
// =========================================

function showEmptyOrders() {

const ordersContent =
    document.getElementById("ordersContent");


if (!ordersContent) {
    return;
}


ordersContent.innerHTML = `

    <div class="orders-empty-icon">
        📦
    </div>

    <h3>
        Замовлень поки немає
    </h3>

    <p>
        Тут з'являться ваші замовлення,
        коли ви щось придбаєте.
    </p>

    <a
        href="/pults-shop.html"
        class="cabinet-button">

        Перейти до магазину

    </a>

`;

}

// =========================================
// ВІДОБРАЖЕННЯ ЗАМОВЛЕНЬ
// =========================================

function renderOrders(orders) {

    const ordersContent =
        document.getElementById("ordersContent");


    if (!ordersContent) {
        return;
    }


    ordersContent.innerHTML = "";


    orders.forEach(order => {

        const orderElement =
            document.createElement("div");


        orderElement.className =
            "cabinet-order";


        const orderNumber =
            escapeHtml(
                String(order.id ?? "—")
            );


        const status =
            escapeHtml(
                String(order.status ?? "Створено")
            );


        const total =
            escapeHtml(
                String(order.total ?? "—")
            );


        const createdAt =
            order.createdAt
                ? new Date(order.createdAt)
                    .toLocaleString("uk-UA")
                : "—";


        const safeCreatedAt =
            escapeHtml(createdAt);


        // Товари замовлення
        const items =
            Array.isArray(order.items)
                ? order.items
                : [];


        const itemsHtml =
            items.length > 0

                ? items.map(item => {

                    const itemName =
                        escapeHtml(
                            String(
                                item.name ??
                                item.title ??
                                item.productName ??
                                "Товар"
                            )
                        );


                    const quantity =
                        escapeHtml(
                            String(
                                item.quantity ??
                                1
                            )
                        );


                    const price =
                        escapeHtml(
                            String(
                                item.price ??
                                "—"
                            )
                        );


                    return `
                        <div class="cabinet-order-item">

                            <div>
                                <strong>
                                    ${itemName}
                                </strong>

                                <span>
                                    Кількість: ${quantity}
                                </span>
                            </div>

                            <strong>
                                ${price} грн
                            </strong>

                        </div>
                    `;

                }).join("")

                : `
                    <p>
                        Товарів у замовленні немає.
                    </p>
                `;


        orderElement.innerHTML = `

            <div class="cabinet-order-info">

                <div>

                    <strong>
                        Замовлення #${orderNumber}
                    </strong>

                    <span>
                        Статус: ${status}
                    </span>

                    <span>
                        Дата: ${safeCreatedAt}
                    </span>

                </div>

                <strong>
                    ${total} грн
                </strong>

            </div>


            <div class="cabinet-order-items">

                <h4>
                    Товари
                </h4>

                ${itemsHtml}

            </div>

        `;


        ordersContent.appendChild(
            orderElement
        );

    });

}
```

// =========================================
// ЗАХИСТ ВІД HTML-ІН'ЄКЦІЙ
// =========================================

function escapeHtml(value) {

const div =
    document.createElement("div");

div.textContent =
    value ?? "";

return div.innerHTML;

}