// =========================
// Registration
// =========================

const registerForm = document.getElementById("registerForm");
const registerMessage = document.getElementById("registerMessage");
const securitySlot=document.createElement("div");
securitySlot.className="pult-security-slot";
registerForm.insertBefore(securitySlot,registerMessage);
let challengeError=null;
const challengePromise=window.PultTurnstile.mount(securitySlot,"register").catch(error=>{
    challengeError=error;securitySlot.textContent=error.message;return null;
});


registerForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    try {
        const challenge=await challengePromise;
        if(!challenge)throw challengeError||new Error("Перевірка безпеки недоступна.");
        const turnstile_token=challenge.enabled?challenge.token():"";
        if(challenge.enabled&&!turnstile_token){
            showMessage("Завершіть перевірку Cloudflare перед реєстрацією.",false);
            return;
        }
        const response = await fetch("/api/auth/register", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                name,
                email,
                password,
                ...(turnstile_token?{turnstile_token}:{})
            })

        });


        const data = await response.json();


        if (!response.ok) {
            if(challenge?.enabled)challenge.reset();
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
        const challenge=await challengePromise;
        if(challenge?.enabled)challenge.reset();
        console.error(error);

        showMessage(
            error?.message||"Помилка з'єднання із сервером",
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