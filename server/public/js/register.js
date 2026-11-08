// =========================
// Registration
// =========================

const registerForm = document.getElementById("registerForm");
const registerMessage = document.getElementById("registerMessage");

registerForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    try {

        const response = await fetch("/api/auth/register", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                name,
                email,
                password
            })

        });


        const data = await response.json();


        if (!response.ok) {

            showMessage(
                data.message || "Не вдалося зареєструватися",
                false
            );

            return;

        }


        showMessage(
            "✓ Реєстрація успішна!",
            true
        );


        registerForm.reset();


        setTimeout(() => {

            window.location.href = "cabinet.html";

        }, 1200);


    } catch (error) {

        console.error(error);

        showMessage(
            "Помилка з'єднання із сервером",
            false
        );

    }

});


function showMessage(message, success) {

    registerMessage.textContent = message;

    registerMessage.classList.remove(
        "hidden",
        "text-red-500",
        "text-green-600"
    );

    registerMessage.classList.add(
        success
            ? "text-green-600"
            : "text-red-500"
    );

}