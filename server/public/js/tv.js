document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("tvRepairForm");

    if (!form) {
        return;
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const submitButton = form.querySelector('button[type="submit"]');

        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = "Відправлення...";
        }

        const formData = new FormData(form);

        const data = {
            name: formData.get("name"),
            phone: formData.get("phone"),
            email: formData.get("email"),
            device_type: "Телевізор",
            brand: formData.get("brand"),
            model: formData.get("model"),
            issue: formData.get("problem"),
            issue_cause: formData.get("history"),
            repair_type: formData.get("repair_type")
        };

        try {
            const response = await fetch("/api/repairs", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Не вдалося відправити заявку");
            }

            alert("Заявку успішно відправлено!");

            form.reset();

            const selectedBrand = document.getElementById("selectedBrand");

            if (selectedBrand) {
                selectedBrand.value = "Samsung";
            }

        } catch (error) {
            console.error("Repair request error:", error);

            alert(
                error.message ||
                "Сталася помилка під час відправлення заявки."
            );

        } finally {
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = "Відправити заявку";
            }
        }
    });
});