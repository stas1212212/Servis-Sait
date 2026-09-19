document.addEventListener("DOMContentLoaded", async () => {
setupCabinetButtons();
await loadCabinet();
});

/* =========================================================
CABINET
========================================================= */

async function loadCabinet() {
try {
const response = await fetch("/api/auth/me", {
method: "GET",
credentials: "same-origin",
headers: {
"Accept": "application/json"
}
});

    if (!response.ok) {

        handleUnauthorized();
        return;

    }

    const data = await response.json();
    if (!data.user) {

        handleUnauthorized();
        return;

    }

    const user = data.user;

    /*
     * Важно:
     * cabinet.html уже содержит слово "Вітаємо,"
     * поэтому сюда вставляем ТОЛЬКО имя.
     */
    setText("welcomeName", user.name || "користувачу");

    setText("userName", user.name || "—");
    setText("userEmail", user.email || "—");

    if (user.created_at) {
        setText(
            "userCreatedAt",
            formatDate(user.created_at)
        );
    } else {
        setText("userCreatedAt", "—");
    }

    /*
     * Загружаем заказы пользователя.
     */
    await loadOrders();

    /*
     * Убираем loading-блок после загрузки.
     */
    const loading = document.getElementById("cabinetContent");

    if (loading) {
        loading.style.display = "none";
    }

} catch (error) {
    console.error("Cabinet loading error:", error);

    const loading = document.getElementById("cabinetContent");

    if (loading) {
        loading.textContent =
            "Не вдалося завантажити дані кабінету.";
    }
}


}

/* =========================================================
ORDERS
========================================================= */

async function loadOrders() {
const ordersContent =
document.getElementById("ordersContent");


if (!ordersContent) return;

try {
    const response = await fetch("/api/orders", {
        method: "GET",
        credentials: "same-origin",
        headers: {
            "Accept": "application/json"
        }
    });

    if (response.status === 401) {
        handleUnauthorized();
        return;
    }

    if (!response.ok) {
        showEmptyOrders();
        updateOverview([]);
        return;
    }

    const data = await response.json();

    /*
     * Backend сейчас возвращает массив напрямую:
     *
     * [
     *   {
     *      id,
     *      status,
     *      total,
     *      createdAt,
     *      items
     *   }
     * ]
     */
    const orders = Array.isArray(data)
        ? data
        : Array.isArray(data.orders)
            ? data.orders
            : [];

    /*
     * Считаем статистику кабинета.
     */
    updateOverview(orders);

    if (orders.length === 0) {
        showEmptyOrders();
        return;
    }

    renderOrders(orders);

} catch (error) {
    console.error("Orders loading error:", error);

    updateOverview([]);
    showEmptyOrders();
}


}

/* =========================================================
OVERVIEW
========================================================= */

function updateOverview(orders) {
    const ordersCount = document.getElementById("ordersCount");
    const ordersTotal = document.getElementById("ordersTotal");

    const count = orders.length;
    const total = orders.reduce((sum, order) => {
        const orderTotal = Number(order.total);

        if (!Number.isFinite(orderTotal)) {
            return sum;
        }

        return sum + orderTotal;
    }, 0);

    if (ordersCount) {
        ordersCount.textContent = String(count);
    }

    if (ordersTotal) {
        ordersTotal.textContent = `${formatMoney(total)} ₴`;
    }
}

/* =========================================================
RENDER ORDERS
========================================================= */

function renderOrders(orders) {
    const ordersContent = document.getElementById("ordersContent");

    if (!ordersContent) return;

    ordersContent.innerHTML = orders
        .map((order) => {
            const orderId = escapeHtml(order.id ?? "—");
            const status = formatOrderStatus(order.status);
            const createdAt = order.createdAt || order.created_at;
            const date = createdAt ? formatDate(createdAt) : "—";
            const total = Number(order.total);
            const formattedTotal = Number.isFinite(total)
                ? `${formatMoney(total)} ₴`
                : "—";
            const items = Array.isArray(order.items) ? order.items : [];
            const itemsHtml = items.length > 0
                ? items.map(renderOrderItem).join("")
                : `
                    <div class="cabinet-order-item">
                        <div>
                            <strong>Товари не знайдено</strong>
                        </div>
                    </div>
                `;

            return `
                <article class="cabinet-order">
                    <div class="cabinet-order-info">
                        <div>
                            <strong>Замовлення #${orderId}</strong>
                            <span>Статус: ${status}</span>
                            <span>Дата: ${escapeHtml(date)}</span>
                        </div>
                        <strong>${formattedTotal}</strong>
                    </div>

                    <div class="cabinet-order-items">
                        <h4>Товари</h4>
                        ${itemsHtml}
                    </div>
                </article>
            `;
        })
        .join("");
}

/* =========================================================
ORDER ITEM
========================================================= */

function renderOrderItem(item) {
    const itemName = item.name ?? item.title ?? item.productName ?? "Товар";
    const quantity = item.qty ?? item.quantity ?? 1;
    const numericPrice = Number(item.price);
    const price = Number.isFinite(numericPrice)
        ? `${formatMoney(numericPrice)} ₴`
        : "—";

    return `
        <div class="cabinet-order-item">
            <div>
                <strong>${escapeHtml(itemName)}</strong>
                <span>Кількість: ${escapeHtml(quantity)}</span>
            </div>
            <strong>${price}</strong>
        </div>
    `;
}

/* =========================================================
EMPTY ORDERS
========================================================= */

function showEmptyOrders() {
    const ordersContent = document.getElementById("ordersContent");

    if (!ordersContent) return;

    ordersContent.innerHTML = `
        <div class="orders-empty">
            <div class="orders-empty-icon">📦</div>
            <h3>Замовлень поки немає</h3>
            <p>Тут з'являться ваші замовлення, коли ви щось придбаєте.</p>
            <a href="/pults-shop.html" class="cabinet-button">Перейти до магазину</a>
        </div>
    `;
}

/* =========================================================
BUTTONS
========================================================= */

function setupCabinetButtons() {


const logoutButton =
    document.getElementById("logoutButton");

if (logoutButton) {
    logoutButton.addEventListener(
        "click",
        logout
    );
}


const editProfileButton =
    document.getElementById("editProfileButton");

const editProfileButtonBottom =
    document.getElementById(
        "editProfileButtonBottom"
    );


if (editProfileButton) {

    editProfileButton.addEventListener(
        "click",
        openEditProfile
    );

}


if (editProfileButtonBottom) {

    editProfileButtonBottom.addEventListener(
        "click",
        openEditProfile
    );

}


/*
 * Кнопки модального окна
 */

const closeProfileModal =
    document.getElementById(
        "closeProfileModal"
    );

const cancelProfileEdit =
    document.getElementById(
        "cancelProfileEdit"
    );

const profileModalOverlay =
    document.getElementById(
        "profileModalOverlay"
    );


if (closeProfileModal) {
    closeProfileModal.addEventListener(
        "click",
        closeEditProfile
    );
}


if (cancelProfileEdit) {
    cancelProfileEdit.addEventListener(
        "click",
        closeEditProfile
    );
}


if (profileModalOverlay) {
    profileModalOverlay.addEventListener(
        "click",
        closeEditProfile
    );
}


}

const profileForm =
document.getElementById("profileForm");

if (profileForm) {
profileForm.addEventListener(
"submit",
saveProfile
);
}


/* =========================================================
LOGOUT
========================================================= */

async function logout() {
    try {
        const response = await fetch("/api/auth/logout", {
            method: "POST",
            credentials: "same-origin",
            headers: {
                Accept: "application/json"
            }
        });

        if (!response.ok) {
            throw new Error("Не вдалося вийти з акаунта");
        }

        window.location.href = "/login.html";
    } catch (error) {
        console.error("Logout error:", error);
        alert(error.message || "Помилка виходу з акаунта");
    }

}

/* =========================================================
EDIT PROFILE
========================================================= */

function openEditProfile() {

const modal =
    document.getElementById("profileModal");

const profileName =
    document.getElementById("profileName");

const profileEmail =
    document.getElementById("profileEmail");

const userName =
    document.getElementById("userName");

const userEmail =
    document.getElementById("userEmail");


if (!modal) return;


/*
 * Заполняем форму текущими данными
 */

if (profileName && userName) {
    profileName.value =
        userName.textContent.trim();
}


if (profileEmail && userEmail) {
    profileEmail.value =
        userEmail.textContent.trim();
}


/*
 * Очищаем старое сообщение
 */

const message =
    document.getElementById(
        "profileFormMessage"
    );

if (message) {
    message.textContent = "";
    message.className =
        "profile-form-message";
}


/*
 * Показываем модальное окно
 */

modal.classList.add("active");


/*
 * Ставим курсор сразу в поле имени
 */

if (profileName) {
    profileName.focus();
}

}

function closeEditProfile() {

const modal =
    document.getElementById("profileModal");

if (!modal) return;

modal.classList.remove("active");

}

async function saveProfile(event) {


event.preventDefault();


const nameInput =
    document.getElementById("profileName");

const emailInput =
    document.getElementById("profileEmail");

const message =
    document.getElementById(
        "profileFormMessage"
    );

const saveButton =
    document.getElementById(
        "saveProfileButton"
    );


if (!nameInput || !emailInput) {
    return;
}


const name =
    nameInput.value.trim();

const email =
    emailInput.value.trim().toLowerCase();


if (!name || !email) {

    if (message) {
        message.textContent =
            "Заповніть усі поля";

        message.className =
            "profile-form-message error";
    }

    return;
}


/*
 * Блокируем кнопку во время запроса
 */

if (saveButton) {
    saveButton.disabled = true;
    saveButton.textContent =
        "Збереження...";
}


if (message) {
    message.textContent = "";
    message.className =
        "profile-form-message";
}


try {

    const response = await fetch(
        "/api/auth/profile",
        {
            method: "PUT",

            credentials: "same-origin",

            headers: {
                "Content-Type":
                    "application/json",

                "Accept":
                    "application/json"
            },

            body: JSON.stringify({
                name: name,
                email: email
            })
        }
    );


    const data =
        await response.json();


    if (!response.ok) {

        throw new Error(
            data.message ||
            "Не вдалося оновити профіль"
        );
    }


    /*
     * Обновляем данные на странице
     */

    setText(
        "userName",
        data.user.name
    );

    setText(
        "userEmail",
        data.user.email
    );

    setText(
        "welcomeName",
        data.user.name
    );


    /*
     * Показываем успешное сообщение
     */

    if (message) {

        message.textContent =
            "Профіль успішно оновлено";

        message.className =
            "profile-form-message success";
    }


    /*
     * Закрываем окно через небольшую паузу,
     * чтобы пользователь увидел сообщение.
     */

    setTimeout(() => {
        closeEditProfile();
    }, 700);


} catch (error) {

    console.error(
        "Profile update error:",
        error
    );


    if (message) {

        message.textContent =
            error.message ||
            "Помилка оновлення профілю";

        message.className =
            "profile-form-message error";
    }

} finally {

    if (saveButton) {

        saveButton.disabled = false;

        saveButton.textContent =
            "Зберегти зміни";
    }
}


}


/* =========================================================
UNAUTHORIZED
========================================================= */

function handleUnauthorized() {
    window.location.href = "/login.html";
}

/* =========================================================
HELPERS
========================================================= */

function setText(id, value) {
    const element = document.getElementById(id);

    if (!element) return;

    element.textContent = value;
}

function formatDate(value) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "—";
    }

    return date.toLocaleDateString("uk-UA", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    });
}

function formatMoney(value) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
        return "0";
    }

    return number.toLocaleString("uk-UA", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function formatOrderStatus(status) {
    const statuses = {
        pending: "Очікує обробки",
        processing: "В обробці",
        shipping: "В дорозі",
        delivered: "Доставлено",
        canceled: "Скасовано",
        cancelled: "Скасовано"
    };

    return escapeHtml(statuses[status] || status || "Невідомий статус");
}

function escapeHtml(value) {
    const div = document.createElement("div");
    div.textContent = String(value ?? "");
    return div.innerHTML;
}
