document.addEventListener("DOMContentLoaded", async () => {
    const accountLinks = document.querySelectorAll(
        'a[href="login.html"]'
    );

    if (accountLinks.length === 0) {
        return;
    }

    try {
        const response = await fetch("/api/auth/me");

        if (!response.ok) {
            // Пользователь не авторизован
            return;
        }

        const data = await response.json();

        if (!data.user) {
            return;
        }

        // Пользователь авторизован
        accountLinks.forEach((link) => {
            link.href = "cabinet.html";

            // Для большой кнопки в бургер-меню
            if (link.textContent.includes("Особистий кабінет")) {
                link.innerHTML = "👤 Мій кабінет";
            }
        });

    } catch (error) {
        console.error("Auth UI error:", error);
    }
});