// =========================================================
// PÁGINA INICIAL (index.html)
// =========================================================
// Este script cuida do modal de "Entrar / Cadastrar" da home:
// - guarda os usuários cadastrados e a sessão ativa no
//   localStorage do navegador (não existe backend/servidor);
// - troca entre as abas de login e cadastro;
// - valida o formulário de cadastro (e-mail duplicado);
// - valida o login e redireciona para a tela do comerciante.
//
// ATENÇÃO (segurança): como não há backend, as senhas ficam
// salvas em texto puro dentro do localStorage. Isso é aceitável
// só para fins de protótipo/estudo. Em um projeto real, o
// cadastro/login precisa ser feito em um servidor, com as
// senhas armazenadas com hash (ex.: bcrypt) e nunca em texto
// puro nem no navegador do usuário.
// =========================================================

const databaseKey = "modaCenterUsers";
const sessionKey = "modaCenterSession";
const storesKey = "modaCenterStores";

const backdrop = document.getElementById("authBackdrop");
const title = document.getElementById("authTitle");
const description = document.getElementById("authDescription");
const toast = document.getElementById("toast");

// ======================================================
// CACHE EM MEMÓRIA
// ======================================================

const localCache = {
    users: null,
    session: null,
    stores: null
};


// ======================================================
// CAMADA DE DADOS
// ======================================================

const database = {

    getUsers() {

        if (Array.isArray(localCache.users)) {
            return localCache.users;
        }

        try {

            const users = JSON.parse(
                localStorage.getItem(databaseKey) || "[]"
            );

            localCache.users = Array.isArray(users)
                ? users
                : [];

        } catch (error) {

            localCache.users = [];

        }

        return localCache.users;
    },


    saveUsers(users) {

        localCache.users = users;

        localStorage.setItem(
            databaseKey,
            JSON.stringify(users)
        );
    },


    getSession() {

        if (localCache.session !== null) {
            return localCache.session;
        }

        try {

            localCache.session = JSON.parse(
                localStorage.getItem(sessionKey) || "null"
            );

        } catch (error) {

            localCache.session = null;

        }

        return localCache.session;
    },


    saveSession(session) {

        localCache.session = session;

        localStorage.setItem(
            sessionKey,
            JSON.stringify(session)
        );
    },


    clearSession() {

        localCache.session = null;

        localStorage.removeItem(sessionKey);
    },


    // ==================================================
    // LOJAS (dados do primeiro acesso do comerciante)
    // ==================================================
    // Guardado como objeto (não array), indexado pelo id do
    // usuário: { "<idDoUsuario>": { name, segments, createdAt } }.
    // Isso torna trivial checar "esse comerciante já configurou a
    // loja?" com stores[user.id], sem precisar procurar em array.

    getStores() {

        if (localCache.stores !== null) {
            return localCache.stores;
        }

        try {

            const stores = JSON.parse(
                localStorage.getItem(storesKey) || "{}"
            );

            localCache.stores = (stores && typeof stores === "object")
                ? stores
                : {};

        } catch (error) {

            localCache.stores = {};

        }

        return localCache.stores;
    },


    saveStores(stores) {

        localCache.stores = stores;

        localStorage.setItem(
            storesKey,
            JSON.stringify(stores)
        );
    }

};


// ======================================================
// USUÁRIOS
// ======================================================

function getUsers() {

    return database.getUsers();

}


function formatDisplayName(name) {

    const value = String(name || "").trim();

    return value
        ? value.charAt(0).toUpperCase() + value.slice(1)
        : value;

}


// ======================================================
// MENSAGENS
// ======================================================

function setNote(formId, message) {

    const element = document.getElementById(formId);

    if (element) {
        element.textContent = message;
    }

}


function showToast(message) {

    if (!toast) return;

    toast.textContent = message;

    toast.classList.add("show");

    clearTimeout(window.toastTimer);

    window.toastTimer = setTimeout(() => {

        toast.classList.remove("show");

    }, 2200);

}


// ======================================================
// TROCA DE ABA
// ======================================================

function switchTab(tab) {

    const isLogin = tab === "login";

    document
        .querySelectorAll(".auth-tab")
        .forEach(button => {

            button.classList.toggle(
                "active",
                button.dataset.tab === tab
            );

        });


    document
        .querySelectorAll(".auth-form")
        .forEach(form => {

            form.classList.toggle(
                "active",
                form.id === (
                    isLogin
                        ? "loginForm"
                        : "registerForm"
                )
            );

        });


    title.textContent = isLogin
        ? "Acesse sua conta"
        : "Crie sua conta";


    description.textContent = isLogin
        ? "Entre para acompanhar suas lojas e favoritos."
        : "Cadastre-se para ter uma experiência completa.";


    setNote("loginNote", "");
    setNote("registerNote", "");

}


// ======================================================
// ABRIR LOGIN / CADASTRO
// ======================================================

function openAuth(tab) {

    switchTab(tab);

    backdrop.classList.add("open");

    setTimeout(() => {

        backdrop
            .querySelector("input")
            ?.focus();

    }, 100);

}


// ======================================================
// FECHAR LOGIN / CADASTRO
// ======================================================

function closeAuth() {

    backdrop.classList.remove("open");

}


// ======================================================
// EVENTOS DOS BOTÕES
// ======================================================

document
    .querySelectorAll(".actions button")
    .forEach(button => {

        button.addEventListener("click", () => {

            openAuth(button.dataset.auth);

        });

    });


document
    .querySelectorAll(".auth-tab")
    .forEach(button => {

        button.addEventListener("click", () => {

            switchTab(button.dataset.tab);

        });

    });


document
    .getElementById("closeModal")
    .addEventListener("click", closeAuth);


backdrop.addEventListener("click", event => {

    if (event.target === backdrop) {
        closeAuth();
    }

});


document.addEventListener("keydown", event => {

    if (event.key === "Escape") {
        closeAuth();
    }

});


// ======================================================
// CADASTRO
// ======================================================

document
    .getElementById("registerForm")
    .addEventListener("submit", event => {

        event.preventDefault();


        const form = new FormData(event.currentTarget);


        const name =
            formatDisplayName(form.get("name"));


        const email =
            form.get("email")
                .trim()
                .toLowerCase();


        const password =
            form.get("password");


        const profile =
            form.get("profile");


        const users = getUsers();


        // Verifica se o e-mail já existe

        if (
            users.some(
                user => user.email === email
            )
        ) {

            setNote(
                "registerNote",
                "Este e-mail já está cadastrado."
            );

            return;
        }


        // Cria o usuário

        users.push({

            id: Date.now(),

            name: name,

            email: email,

            password: password,

            profile: profile

        });


        // Salva usuário

        database.saveUsers(users);


        // Limpa formulário

        event.currentTarget.reset();


        // Volta para login

        switchTab("login");


        // Mostra mensagem

        setNote(
            "loginNote",
            "Conta criada. Agora entre com seus dados."
        );

    });


// ======================================================
// LOGIN
// ======================================================

document
    .getElementById("loginForm")
    .addEventListener("submit", event => {

        event.preventDefault();


        const form =
            new FormData(event.currentTarget);


        const email =
            form.get("email")
                .trim()
                .toLowerCase();


        const password =
            form.get("password");


        // Atalho de administrador só para testes durante o desenvolvimento.
        // IMPORTANTE: remover este atalho antes de publicar o site,
        // já que é uma senha fixa e visível para qualquer pessoa que
        // olhar o código-fonte.
        const user = email === "admin" && password === "123456"
            ? {
                id: "admin",
                name: "Teste",
                email: "admin",
                password: password,
                profile: "comerciante"
            }
            : getUsers().find(item =>
                item.email === email &&
                item.password === password
            );


        // Usuário não encontrado

        if (!user) {

            setNote(
                "loginNote",
                "E-mail ou senha inválidos."
            );

            return;
        }


        // ==================================================
        // SALVA A SESSÃO COMPLETA
        // ==================================================

        database.saveSession({

            id: user.id,

            name: formatDisplayName(user.name),

            email: user.email,

            avatar: user.avatar || null,

            profile: user.profile

        });


        // Observação: o nome do usuário já fica salvo dentro da
        // sessão acima (database.saveSession), então não é
        // necessário duplicar essa informação em outra chave do
        // localStorage — isso só criaria duas fontes de verdade
        // que poderiam ficar dessincronizadas entre si.

        // Limpa formulário

        event.currentTarget.reset();


        // ==================================================
        // RESTRIÇÃO POR TIPO DE CONTA
        // ==================================================
        // Só contas "comerciante" podem entrar na área do comerciante
        // (inicio_comerciante.html e as demais telas). Contas "cliente"
        // permanecem na página inicial — a área do comerciante ainda
        // não existe para esse perfil.
        if (user.profile === "comerciante") {

            // Fecha modal
            closeAuth();

            const stores = database.getStores();

            // Primeiro acesso deste comerciante: ele ainda não
            // configurou o nome e o segmento da loja. Antes de ver
            // a tela inicial do comerciante, precisa preencher isso.
            window.location.href = stores[user.id]
                ? "inicio_comerciante.html"
                : "cadastro-loja.html";

        } else {

            // Fecha modal
            closeAuth();

            // A área do cliente ainda não foi construída neste
            // projeto — por enquanto só a área do comerciante existe.
            showToast("Login realizado! A área do cliente ainda está em desenvolvimento.");

        }

    });


    // O Logout retorna para cá com ?login=1 para abrir o formulário automaticamente.
if (new URLSearchParams(window.location.search).get("login") === "1") {
    openAuth("login");
}

// Uma tela do comerciante redirecionou para cá porque a conta logada
// não é de comerciante (ver js/comerciante-guard.js). Avisa o motivo.
if (new URLSearchParams(window.location.search).get("area") === "comerciante") {
    showToast("Esta área é exclusiva para contas de comerciante.");
}