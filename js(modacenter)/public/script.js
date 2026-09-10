// ELEMENTOS DO HTML

const authBackdrop = document.getElementById("authBackdrop");
const closeModal = document.getElementById("closeModal");

const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");

const loginNote = document.getElementById("loginNote");
const registerNote = document.getElementById("registerNote");

const accountPage = document.getElementById("accountPage");
const accountMessage = document.getElementById("accountMessage");
const logoutButton = document.getElementById("logoutButton");

const authTitle = document.getElementById("authTitle");
const authDescription = document.getElementById("authDescription");


// BOTÕES ENTRAR / CADASTRAR

document.querySelectorAll("[data-auth]").forEach(button => {

    button.addEventListener("click", () => {

        const action = button.dataset.auth;

        abrirModal(action);

    });

});


// ABRIR MODAL

function abrirModal(tab) {

    authBackdrop.classList.add("open");

    switchTab(tab);

}


// FECHAR MODAL

closeModal.addEventListener("click", () => {

    authBackdrop.classList.remove("open");
});


// Fechar clicando fora da janela
authBackdrop.addEventListener("click", event => {

    if (event.target === authBackdrop) {

        authBackdrop.classList.remove("open");

    }

});


// TROCAR ENTRE LOGIN E CADASTRO

document.querySelectorAll("[data-tab]").forEach(button => {

    button.addEventListener("click", () => {

        const tab = button.dataset.tab;

        switchTab(tab);

    });

});


function switchTab(tab) {

    const tabs = document.querySelectorAll(".auth-tab");
    const forms = document.querySelectorAll(".auth-form");

    tabs.forEach(button => {

        button.classList.toggle(
            "active",
            button.dataset.tab === tab
        );

    });

    forms.forEach(form => {

        if (tab === "login") {

            form.classList.toggle(
                "active",
                form.id === "loginForm"
            );

        } else {

            form.classList.toggle(
                "active",
                form.id === "registerForm"
            );

        }

    });


    if (tab === "login") {

        authTitle.textContent = "Acesse sua conta";

        authDescription.textContent =
            "Entre para acompanhar suas lojas e favoritos.";

    } else {

        authTitle.textContent = "Crie sua conta";

        authDescription.textContent =
            "Cadastre-se para aproveitar o Moda Center.";

    }

    setNote("loginNote", "");
    setNote("registerNote", "");

}


// MENSAGENS

function setNote(id, mensagem) {

    const elemento = document.getElementById(id);

    if (elemento) {

        elemento.textContent = mensagem;

    }

}

// CADASTRO

registerForm.addEventListener("submit", async event => {

    event.preventDefault();

    const formulario = event.currentTarget;
    const form = new FormData(formulario);
    const name = form.get("name").trim();
    const email = form.get("email").trim().toLowerCase();
    const password = form.get("password");
    const profile = form.get("profile");


    setNote("registerNote", "Criando sua conta...");


    try {

        const resposta = await fetch("/api/register", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                name,
                email,
                password,
                profile
            })

        });


        const resultado = await resposta.json();


        if (!resposta.ok) {

            setNote(
                "registerNote",
                resultado.mensagem || "Não foi possível criar a conta."
            );

            return;

        }


        formulario.reset();

        switchTab("login");


        setNote(
            "loginNote",
            "Conta criada com sucesso! Agora entre com seus dados."
        );

    } catch (error) {

        console.error(error);

        setNote(
            "registerNote",
            "Não foi possível conectar ao servidor."
        );

    }

});


// LOGIN

loginForm.addEventListener("submit", async event => {

    event.preventDefault();

    // Guarda o formulário antes do await
    const formulario = event.currentTarget;
    const form = new FormData(formulario);

    const email = form.get("email").trim().toLowerCase();
    const password = form.get("password");

    setNote("loginNote", "Entrando...");

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
                resultado.mensagem || "E-mail ou senha inválidos."
            );

            return;
        }

        // Salva a sessão no navegador
        sessionStorage.setItem(
            "modaCenterSession",
            JSON.stringify(resultado.usuario)
        );

        // Limpa o formulário
        formulario.reset();

        // Fecha o modal
        authBackdrop.classList.remove("open");

        // Mostra a tela da conta
        showAccount(resultado.usuario);

    } catch (error) {

        console.error(error);

        setNote(
            "loginNote",
            "Não foi possível conectar ao servidor."
        );

    }

});


// MOSTRAR CONTA

function showAccount(user) {

    if (!user) {
        return;
    }

    accountMessage.textContent =
        `Bem-vindo(a), ${user.name}!`;

    document
        .querySelector(".app")
        .classList.add("account-active");

}


// LOGOUT

logoutButton.addEventListener("click", () => {

    sessionStorage.removeItem(
        "modaCenterSession"
    );


    document.querySelector(".app").classList.remove("account-active");


    showToast("Você saiu da sua conta.");

});


// TOAST

function showToast(mensagem) {

    const toast = document.getElementById("toast");

    if (!toast) {
        return;
    }


    toast.textContent = mensagem;

    toast.classList.add("show")


    setTimeout(() => {

        toast.classList.remove("show")

    }, 3000);

}


// RECUPERAR SESSÃO

try {

    const session = sessionStorage.getItem(
        "modaCenterSession"
    );


    if (session) {

        const user = JSON.parse(session);


        if (user?.name) {

            showAccount(user);

        }

    }

} catch (error) {

    console.error(
        "Erro ao recuperar sessão:",
        error
    );


    sessionStorage.removeItem(
        "modaCenterSession"
    );

}