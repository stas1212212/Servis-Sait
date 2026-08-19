document.addEventListener("DOMContentLoaded", async () => {
    const accountLinks = Array.from(document.querySelectorAll('a')).filter(a => {
        const href = a.getAttribute('href');
        if (!href) return false;
        // normalize './login.html', '/login.html', 'login.html'
        const cleaned = href.replace(/^\.\//, '').replace(/^\//, '');
        return cleaned.endsWith('login.html');
    });

    if (accountLinks.length === 0) {
        return;
    }

    // Intercept clicks on account links: check auth and redirect accordingly
    accountLinks.forEach((link) => {
        link.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopImmediatePropagation();
            const original = link.getAttribute('href');
            console.debug('Auth link clicked, checking auth status...', { href: original });
            try {
                const r = await fetch('/api/auth/me', { credentials: 'include', cache: 'no-store' });
                console.debug('/api/auth/me status on click:', r.status);
                if (r.ok) {
                    window.location.href = 'cabinet.html';
                } else {
                    window.location.href = original;
                }
            } catch (err) {
                console.error('Auth check on click failed:', err);
                window.location.href = original;
            }
        }, { passive: false });
    });

    try {
        const response = await fetch("/api/auth/me", { credentials: 'include' });

        if (!response.ok) {
            // Пользователь не авторизован
            return;
        }

        const data = await response.json();

        if (!data.user) {
            return;
        }

        // Пользователь авторизован
        const name = data.user.name || data.user.email || "Мій кабінет";

        accountLinks.forEach((link) => {
            link.href = "cabinet.html";

            // Для большой кнопки в бургер-меню
            if (link.textContent.includes("Особистий кабінет")) {
                link.innerHTML = `👤 ${name}`;
            } else {
                // Маленькая кнопка в основной шапке — показываем имя рядом с иконкой (не ломая верстку)
                link.innerHTML = `👤 <span class="ml-2 hidden sm:inline">${name}</span>`;
            }

            link.title = name;
        });

        // Добавим кнопку выхода рядом с аккаунтом в шапке
        try {
            const headerEl = document.querySelector("header");

            if (headerEl) {
                const headerAccount = headerEl.querySelector('a[href="cabinet.html"]');

                if (headerAccount && (!headerAccount.nextElementSibling || !headerAccount.nextElementSibling.classList.contains('auth-logout-btn'))) {
                    const logoutBtn = document.createElement('button');
                    logoutBtn.textContent = 'Вийти';
                    logoutBtn.className = 'ml-2 px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition text-sm auth-logout-btn';
                    logoutBtn.addEventListener('click', async () => {
                        try {
                            const r = await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
                            if (r.ok) location.reload();
                            else alert('Помилка виходу');
                        } catch (e) {
                            console.error('Logout error:', e);
                            alert('Помилка виходу');
                        }
                    });

                    headerAccount.parentNode.insertBefore(logoutBtn, headerAccount.nextSibling);
                }
            }

            // Добавим ссылку выхода в бургер-меню рядом с пунктом кабинета
            const burgerAccount = document.querySelector('#burgerMenu a[href="cabinet.html"]');
            if (burgerAccount && (!burgerAccount.nextElementSibling || !burgerAccount.nextElementSibling.classList.contains('burger-logout'))) {
                const logoutA = document.createElement('a');
                logoutA.href = '#';
                logoutA.textContent = 'Вийти';
                logoutA.className = 'block text-center py-3 rounded-xl bg-gray-100 hover:bg-gray-200 transition burger-logout';
                logoutA.addEventListener('click', async (e) => {
                    e.preventDefault();
                    try {
                        const r = await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
                        if (r.ok) location.reload();
                        else alert('Помилка виходу');
                    } catch (err) {
                        console.error(err);
                        alert('Помилка');
                    }
                });

                burgerAccount.parentNode.insertBefore(logoutA, burgerAccount.nextSibling);
            }
        } catch (domErr) {
            console.error('Auth UI DOM error:', domErr);
        }

    } catch (error) {
        console.error("Auth UI error:", error);
    }
});