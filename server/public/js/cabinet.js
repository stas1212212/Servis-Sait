document.addEventListener("DOMContentLoaded", async () => {

    const content = document.getElementById("cabinetContent");

    const userName = document.getElementById("userName");
    const userEmail = document.getElementById("userEmail");
    const userCreated = document.getElementById("userCreated");
    const welcomeTitle = document.getElementById("welcomeTitle");

    const logoutButton = document.getElementById("logoutButton");

    const editProfileButton =
        document.getElementById("editProfileButton");

    const editProfileButton2 =
        document.getElementById("editProfileButton2");

    const profileModal =
        document.getElementById("profileModal");

    const closeProfileModal =
        document.getElementById("closeProfileModal");

    const profileForm =
        document.getElementById("profileForm");

    const profileName =
        document.getElementById("profileName");

    const profileEmail =
        document.getElementById("profileEmail");

    const profileMessage =
        document.getElementById("profileMessage");


    let currentUser = null;


    // =========================
    // Получение пользователя
    // =========================

    async function loadUser() {

        try {

            const response = await fetch("/api/auth/me", {
                credentials: "same-origin"
            });


            if (!response.ok) {

                window.location.href = "/login.html";

                return;

            }


            const data = await response.json();

            if (!data.user) {

                window.location.href = "/login.html";

                return;

            }


            currentUser = data.user;

            renderUser(currentUser);


        } catch (error) {

            console.error("Cabinet error:", error);

            if (content) {

                content.innerHTML = `
                    <p>
                        Не вдалося завантажити дані акаунта.
                    </p>
                `;

            }

        }

    }


    // =========================
    // Отображение пользователя
    // =========================

    function renderUser(user) {

        if (welcomeTitle) {

            welcomeTitle.textContent =
                `Вітаємо, ${user.name}!`;

        }


        if (userName) {

            userName.textContent =
                user.name;

        }


        if (userEmail) {

            userEmail.textContent =
                user.email;

        }


        if (userCreated) {

            userCreated.textContent =
                formatDate(user.created_at);

        }

    }


    // =========================
    // Дата регистрации
    // =========================

    function formatDate(value) {

        if (!value) {
            return "—";
        }


        const date = new Date(value);


        return date.toLocaleDateString(
            "uk-UA",
            {
                day: "2-digit",
                month: "long",
                year: "numeric"
            }
        );

    }


    // =========================
    // Открытие редактора
    // =========================

    function openProfileModal() {

        if (!currentUser) {
            return;
        }


        profileName.value =
            currentUser.name || "";

        profileEmail.value =
            currentUser.email || "";


        profileMessage.textContent = "";

        profileMessage.style.color = "";


        profileModal.classList.remove("hidden");

    }


    // =========================
    // Закрытие редактора
    // =========================

    function closeProfile() {

        profileModal.classList.add("hidden");

    }


    if (editProfileButton) {

        editProfileButton.addEventListener(
            "click",
            openProfileModal
        );

    }


    if (editProfileButton2) {

        editProfileButton2.addEventListener(
            "click",
            openProfileModal
        );

    }


    if (closeProfileModal) {

        closeProfileModal.addEventListener(
            "click",
            closeProfile
        );

    }


    if (profileModal) {

        profileModal.addEventListener(
            "click",
            (event) => {

                if (event.target === profileModal) {

                    closeProfile();

                }

            }
        );

    }


    // =========================
    // Сохранение профиля
    // =========================

    if (profileForm) {

        profileForm.addEventListener(
            "submit",
            async (event) => {

                event.preventDefault();


                const name =
                    profileName.value.trim();

                const email =
                    profileEmail.value.trim();


                if (!name || !email) {

                    showProfileMessage(
                        "Заповніть усі поля",
                        false
                    );

                    return;

                }


                try {

                    const response =
                        await fetch(
                            "/api/auth/profile",
                            {
                                method: "PUT",

                                credentials:
                                    "same-origin",

                                headers: {
                                    "Content-Type":
                                        "application/json"
                                },

                                body:
                                    JSON.stringify({
                                        name,
                                        email
                                    })
                            }
                        );


                    const data =
                        await response.json();


                    if (!response.ok) {

                        showProfileMessage(
                            data.message ||
                            "Не вдалося зберегти зміни",
                            false
                        );

                        return;

                    }


                    currentUser =
                        data.user;


                    renderUser(
                        currentUser
                    );


                    showProfileMessage(
                        "✓ Профіль оновлено",
                        true
                    );


                    setTimeout(
                        closeProfile,
                        700
                    );


                } catch (error) {

                    console.error(
                        "Profile update error:",
                        error
                    );


                    showProfileMessage(
                        "Помилка з'єднання із сервером",
                        false
                    );

                }

            }
        );

    }


    // =========================
    // Выход
    // =========================

    if (logoutButton) {

        logoutButton.addEventListener(
            "click",
            async () => {

                try {

                    const response =
                        await fetch(
                            "/api/auth/logout",
                            {
                                method: "POST",

                                credentials:
                                    "same-origin"
                            }
                        );


                    if (!response.ok) {

                        throw new Error(
                            "Logout failed"
                        );

                    }


                    window.location.href =
                        "/login.html";


                } catch (error) {

                    console.error(
                        "Logout error:",
                        error
                    );


                    alert(
                        "Не вдалося вийти з акаунта"
                    );

                }

            }
        );

    }


    // =========================
    // Сообщения
    // =========================

    function showProfileMessage(
        message,
        success
    ) {

        profileMessage.textContent =
            message;

        profileMessage.style.color =
            success
                ? "#16a34a"
                : "#dc2626";

    }


    // Запускаем загрузку
    loadUser();

});