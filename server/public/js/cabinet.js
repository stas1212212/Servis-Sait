document.addEventListener("DOMContentLoaded", async () => {
    const content = document.getElementById("cabinetContent");
    const logoutButton = document.getElementById("logoutButton");

    try {
        const response = await fetch("/api/auth/me");

        if (!response.ok) {
            // Пользователь не авторизован
            window.location.href = "/login.html";
            return;
        }

        const data = await response.json();
        const user = data.user;

        content.innerHTML = `
            <div class="cabinet-info">
                <p><strong>Ім'я:</strong> ${escapeHtml(user.name)}</p>
                <p><strong>Email:</strong> ${escapeHtml(user.email)}</p>
            </div>
        `;

    } catch (error) {
        console.error("Cabinet error:", error);

        content.innerHTML = `
            <p>Не вдалося завантажити дані акаунта.</p>
        `;
    }

    logoutButton.addEventListener("click", async () => {
        try {
            const response = await fetch("/api/auth/logout", {
                method: "POST"
            });

            if (!response.ok) {
                throw new Error("Logout failed");
            }

            window.location.href = "/login.html";

        } catch (error) {
            console.error("Logout error:", error);
            alert("Не вдалося вийти з акаунта");
        }
    });
});

function escapeHtml(value) {
    const div = document.createElement("div");
    div.textContent = value ?? "";
    return div.innerHTML;
}