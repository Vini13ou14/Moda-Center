document
    .getElementById("loginForm")
    .addEventListener("submit", async event => {

        event.preventDefault();

        const form = new FormData(event.currentTarget);

        const email = form.get("email").trim().toLowerCase();
        const password = form.get("password");

        try {

            const resposta = await fetch("/api/login", {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    email,
                    password
                })
            });

            const resultado = await resposta.json();

            if (!resposta.ok) {

                setNote(
                    "loginNote",
                    resultado.mensagem
                );

                return;
            }

            const user = resultado.usuario;

            // Sessão temporária no navegador
            sessionStorage.setItem(
                "modaCenterSession",
                JSON.stringify(user)
            );

            event.currentTarget.reset();

            closeAuth();

            showAccount(user);

        } catch (error) {

            console.error(error);

            setNote(
                "loginNote",
                "Não foi possível conectar ao servidor."
            );
        }
    });
//=== só test ===
document
    .getElementById("logoutButton")
    .addEventListener("click", () => {

        sessionStorage.removeItem("modaCenterSession");

        showHome();

        showToast("Você saiu da sua conta.");
    });