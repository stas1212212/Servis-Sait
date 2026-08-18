// =========================
// Login
// =========================

const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");

loginForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    try {

        const response = await fetch("/api/auth/login", {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                email,
                password
            })
        });

        const data = await response.json();

        if (!response.ok) {

            showMessage(
                data.message || "Не вдалося увійти",
                false
            );

            return;
        }

        showMessage(
            "✓ Вхід успішний!",
            true
        );

        // Пока просто сохраняем данные пользователя.
        // Позже заменим это на нормальную сессию/JWT.
        localStorage.setItem(
            "pultplus-user",
            JSON.stringify(data.user)
        );

        setTimeout(() => {

            window.location.href = "index.html";

        }, 1000);

    } catch (error) {

        console.error("Login error:", error);

        showMessage(
            "Помилка з'єднання із сервером",
            false
        );
    }
});


function showMessage(message, success) {

    loginMessage.textContent = message;

    loginMessage.classList.remove(
        "hidden",
        "text-red-500",
        "text-green-600"
    );

    loginMessage.classList.add(
        success
            ? "text-green-600"
            : "text-red-500"
    );
}