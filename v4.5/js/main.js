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
const API_ENABLED = window.location.protocol !== "file:";

const backdrop = document.getElementById("authBackdrop");
const title = document.getElementById("authTitle");
const description = document.getElementById("authDescription");
const toast = document.getElementById("toast");

// ======================================================
// FETCH COM NOVA TENTATIVA AUTOMÁTICA
// ======================================================
// O plano gratuito do Render "adormece" o servidor depois de um
// tempo sem receber requisições. A primeira chamada depois disso
// pode falhar enquanto o servidor acorda (isso pode levar de 30s a
// mais de 1 minuto). Em vez de mostrar logo um erro pra pessoa
// usuária, tentamos de novo automaticamente algumas vezes antes de
// desistir, avisando o motivo enquanto isso.
async function fetchWithRetry(url, options, { attempts = 3, delayMs = 4000, onRetry } = {}) {
    let lastError;

    for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
            return await fetch(url, options);
        } catch (error) {
            lastError = error;
            if (attempt < attempts) {
                onRetry?.(attempt);
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        }
    }

    throw lastError;
}

async function syncLegacyUsers() {
    if (!API_ENABLED) return;
    try {
        const users = JSON.parse(localStorage.getItem(databaseKey) || "[]");
        if (Array.isArray(users) && users.length) {
            const response = await fetch("/api/auth/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ users }) });
            if (!response.ok) throw new Error("Falha ao migrar contas");
        }
        return true;
    } catch (error) {
        return false;
    }
}

async function syncLegacyStores() {
    if (!API_ENABLED) return;
    try {
        const stores = JSON.parse(localStorage.getItem(storesKey) || "{}");
        await Promise.all(Object.entries(stores).map(([ownerId, store]) => fetch(`/api/stores/${encodeURIComponent(ownerId)}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...store, ownerId })
        })));
    } catch (error) {
        // A loja continua disponível localmente se o servidor estiver indisponível.
    }
}

const legacyUsersSync = Promise.all([syncLegacyUsers(), syncLegacyStores()]);

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


// ======================================================
// CONTA "ADMIN"
// ======================================================
// Mesma conta fixa criada no servidor (ver ensureAdminAccount em
// server.js): usuário "admin", senha "123456", perfil "admin". Isso
// aqui garante que ela também exista quando o site é aberto direto
// pelo navegador, sem servidor (API_ENABLED === false — ver o
// comentário no topo deste arquivo), já que nesse modo os usuários
// só existem dentro do localStorage deste navegador.
//
// Rodar isso de novo em toda visita não duplica a conta: sempre
// verifica se "admin" já está na lista antes de adicionar.
function ensureAdminAccountLocally() {

    const users = getUsers();

    if (users.some(user => user.email === "admin")) {
        return;
    }

    database.saveUsers([
        ...users,
        {
            id: "admin",
            // "Teste", pelo mesmo motivo explicado em server.js: o
            // projeto já trocava o nome exibido para "Teste" quando
            // o e-mail da sessão é "admin", mas só nas telas do
            // comerciante — usar "Teste" como nome real deixa isso
            // consistente em qualquer tela, sem depender de replicar
            // essa troca em cada uma.
            name: "Teste",
            email: "admin",
            password: "123456",
            profile: "admin",
            avatar: null
        }
    ]);

}

ensureAdminAccountLocally();


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

    document.querySelector(".auth-tabs").style.display = "";

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
// ESCOLHA DE PERFIL DA CONTA "ADMIN"
// ======================================================
// Ao logar com a conta "admin" (ver o branch "user.profile ===
// 'admin'" dentro do listener do loginForm, mais abaixo), em vez de
// redirecionar direto para a área de cliente ou de comerciante como
// acontece com as contas normais, este passo extra deixa a pessoa
// escolher qual área quer ver — podendo entrar em qualquer uma das
// duas em logins diferentes, sem precisar de duas contas separadas.

const adminChooseForm = document.getElementById("adminChooseForm");

function showAdminChooser(user) {

    // Esconde as abas ENTRAR/CADASTRAR e os dois formulários,
    // deixando só a escolha de perfil visível.
    document
        .querySelectorAll(".auth-tab")
        .forEach(button => button.classList.remove("active"));

    document.querySelector(".auth-tabs").style.display = "none";

    document
        .querySelectorAll(".auth-form")
        .forEach(form => form.classList.remove("active"));

    adminChooseForm.classList.add("active");

    title.textContent = "Bem-vindo, administrador";
    description.textContent = "Escolha como deseja entrar desta vez.";

    // Guarda o usuário logado para os botões de escolha usarem —
    // eles não têm o "user" no escopo deles, então ficam sabendo
    // por aqui qual conta escolher o perfil.
    adminChooseForm.dataset.pendingUser = JSON.stringify(user);

}

// Um único listener no contêiner (em vez de um em cada botão) já
// cobre os dois botões de escolha — mais simples de manter.
adminChooseForm.addEventListener("click", async event => {

    const button = event.target.closest("[data-admin-enter]");

    if (!button) return;

    const chosenProfile = button.dataset.adminEnter;

    const user = JSON.parse(
        adminChooseForm.dataset.pendingUser || "null"
    );

    if (!user) return;


    // Sessão salva com o perfil ESCOLHIDO (cliente/comerciante), não
    // com "admin" — é esse valor que as áreas do site conferem para
    // liberar o acesso (ver js/comerciante-guard.js e js/cliente.js).
    // "isAdmin" fica marcado à parte, só para o site saber, se
    // precisar, que esta sessão pertence à conta de administrador.
    database.saveSession({
        id: user.id,
        name: formatDisplayName(user.name),
        email: user.email,
        avatar: user.avatar || null,
        profile: chosenProfile,
        isAdmin: true
    });

    closeAuth();

    if (chosenProfile === "comerciante") {

        let stores = database.getStores();

        if (API_ENABLED) {
            try {
                const storeResponse = await fetch(`/api/stores/${encodeURIComponent(user.id)}`, { cache: "no-store" });
                const storeData = await storeResponse.json();
                if (storeData.store) { stores = { ...stores, [user.id]: storeData.store }; database.saveStores(stores); }
            } catch (error) { /* usa o cache local */ }
        }

        // Mesma regra de qualquer comerciante: sem loja configurada
        // ainda, primeiro passa pelo cadastro da loja.
        window.location.href = stores[user.id]
            ? "inicio_comerciante.html"
            : "cadastro-loja.html";

    } else {

        window.location.href = "cliente.html";

    }

});


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
    .addEventListener("submit", async event => {

        event.preventDefault();

        const formElement =
            event.currentTarget;


        // ==========================================
        // EVITA DUPLO CLIQUE / DUPLO ENVIO
        // ==========================================

        if (
            formElement.dataset.submitting === "true"
        ) {
            return;
        }

        formElement.dataset.submitting = "true";


        try {

            const form =
                new FormData(formElement);


            const name =
                formatDisplayName(
                    form.get("name")
                );


            const email =
                String(
                    form.get("email") || ""
                )
                    .trim()
                    .toLowerCase();


            const password =
                String(
                    form.get("password") || ""
                );


            const profile =
                String(
                    form.get("profile") || ""
                );


            // ==========================================
            // VALIDAÇÕES
            // ==========================================

            if (!name) {

                setNote(
                    "registerNote",
                    "Informe seu nome."
                );

                return;
            }


            if (!email) {

                setNote(
                    "registerNote",
                    "Informe seu e-mail."
                );

                return;
            }


            if (!password) {

                setNote(
                    "registerNote",
                    "Informe sua senha."
                );

                return;
            }


            if (!profile) {

                setNote(
                    "registerNote",
                    "Escolha o tipo de conta."
                );

                return;
            }


            // ==========================================
            // MODO SERVIDOR
            // ==========================================

            if (API_ENABLED) {

                // --------------------------------------
                // ID ÚNICO DESTA TENTATIVA
                // --------------------------------------

                const registrationId =
                    crypto.randomUUID();


                setNote(
                    "registerNote",
                    "Criando sua conta..."
                );


                try {

                    const response =
                        await fetchWithRetry(

                            "/api/auth/register",

                            {
                                method: "POST",

                                headers: {
                                    "Content-Type":
                                        "application/json"
                                },

                                body: JSON.stringify({

                                    registrationId,

                                    name,

                                    email,

                                    password,

                                    profile

                                })
                            },

                            {
                                attempts: 3,

                                delayMs: 5000,

                                onRetry: () => {

                                    setNote(
                                        "registerNote",
                                        "O servidor está iniciando, aguarde alguns segundos..."
                                    );

                                }
                            }
                        );


                    // ==================================
                    // E-MAIL JÁ EXISTENTE
                    // ==================================

                    if (
                        response.status === 409
                    ) {

                        let data = {};

                        try {
                            data =
                                await response.json();
                        } catch (error) {}


                        setNote(
                            "registerNote",
                            data.error ||
                            "Este e-mail já está cadastrado."
                        );

                        return;
                    }


                    // ==================================
                    // OUTROS ERROS
                    // ==================================

                    if (!response.ok) {

                        let data = {};

                        try {
                            data =
                                await response.json();
                        } catch (error) {}


                        setNote(
                            "registerNote",
                            data.error ||
                            "Não foi possível criar a conta."
                        );

                        return;
                    }


                    // ==================================
                    // LÊ USUÁRIO CRIADO
                    // ==================================

                    const data =
                        await response.json();


                    const user =
                        data.user;


                    if (!user || !user.id) {

                        setNote(
                            "registerNote",
                            "A conta foi criada, mas não foi possível iniciar a sessão."
                        );

                        return;
                    }


                    // ==================================
                    // SALVA SESSÃO
                    // ==================================

                    database.saveSession({

                        id: user.id,

                        name:
                            formatDisplayName(
                                user.name || name
                            ),

                        email:
                            user.email || email,

                        avatar:
                            user.avatar || null,

                        profile:
                            user.profile || profile

                    });


                    // ==================================
                    // LIMPA FORMULÁRIO
                    // ==================================

                    formElement.reset();


                    // ==================================
                    // COMERCIANTE
                    // ==================================

                    if (
                        user.profile ===
                        "comerciante"
                    ) {

                        closeAuth();


                        let stores =
                            database.getStores();


                        // --------------------------------
                        // Verifica se já existe loja
                        // --------------------------------

                        try {

                            const storeResponse =
                                await fetch(
                                    `/api/stores/${encodeURIComponent(user.id)}`,
                                    {
                                        cache: "no-store"
                                    }
                                );


                            if (
                                storeResponse.ok
                            ) {

                                const storeData =
                                    await storeResponse.json();


                                if (
                                    storeData.store
                                ) {

                                    stores = {

                                        ...stores,

                                        [user.id]:
                                            storeData.store

                                    };


                                    database.saveStores(
                                        stores
                                    );
                                }
                            }

                        } catch (error) {

                            console.warn(
                                "Não foi possível verificar a loja no servidor. Usando cache local."
                            );
                        }


                        // --------------------------------
                        // NOVO COMERCIANTE
                        // --------------------------------

                        if (
                            !stores[user.id]
                        ) {

                            window.location.href =
                                "cadastro-loja.html";

                            return;
                        }


                        // --------------------------------
                        // COMERCIANTE COM LOJA
                        // --------------------------------

                        window.location.href =
                            "inicio_comerciante.html";

                        return;
                    }


                    // ==================================
                    // CLIENTE
                    // ==================================

                    closeAuth();

                    window.location.href =
                        "cliente.html";

                    return;


                } catch (error) {

                    console.error(
                        "Erro no cadastro:",
                        error
                    );


                    // ==================================
                    // ÚLTIMA TENTATIVA:
                    // VERIFICA SE A CONTA FOI CRIADA
                    // ==================================

                    setNote(
                        "registerNote",
                        "Verificando o cadastro..."
                    );


                    try {

                        await new Promise(
                            resolve =>
                                setTimeout(
                                    resolve,
                                    2000
                                )
                        );


                        const loginResponse =
                            await fetch(
                                "/api/auth/login",
                                {
                                    method: "POST",

                                    headers: {
                                        "Content-Type":
                                            "application/json"
                                    },

                                    body:
                                        JSON.stringify({
                                            email,
                                            password
                                        })
                                }
                            );


                        if (
                            loginResponse.ok
                        ) {

                            const loginData =
                                await loginResponse.json();


                            const user =
                                loginData.user;


                            if (
                                user &&
                                user.id
                            ) {

                                // ------------------------
                                // Cadastro deu certo,
                                // apenas a resposta original
                                // foi perdida.
                                // ------------------------

                                database.saveSession({

                                    id: user.id,

                                    name:
                                        formatDisplayName(
                                            user.name || name
                                        ),

                                    email:
                                        user.email ||
                                        email,

                                    avatar:
                                        user.avatar ||
                                        null,

                                    profile:
                                        user.profile ||
                                        profile

                                });


                                formElement.reset();

                                closeAuth();


                                // ------------------------
                                // Comerciante
                                // ------------------------

                                if (
                                    user.profile ===
                                    "comerciante"
                                ) {

                                    let stores =
                                        database.getStores();


                                    try {

                                        const storeResponse =
                                            await fetch(
                                                `/api/stores/${encodeURIComponent(user.id)}`,
                                                {
                                                    cache:
                                                        "no-store"
                                                }
                                            );


                                        if (
                                            storeResponse.ok
                                        ) {

                                            const storeData =
                                                await storeResponse.json();


                                            if (
                                                storeData.store
                                            ) {

                                                stores = {

                                                    ...stores,

                                                    [user.id]:
                                                        storeData.store

                                                };


                                                database.saveStores(
                                                    stores
                                                );
                                            }
                                        }

                                    } catch (error) {}


                                    window.location.href =
                                        stores[user.id]
                                            ? "inicio_comerciante.html"
                                            : "cadastro-loja.html";

                                    return;
                                }


                                // ------------------------
                                // Cliente
                                // ------------------------

                                window.location.href =
                                    "cliente.html";

                                return;
                            }
                        }

                    } catch (loginError) {

                        console.error(
                            "Falha ao confirmar cadastro:",
                            loginError
                        );
                    }


                    // ==================================
                    // REALMENTE NÃO FOI POSSÍVEL
                    // ==================================

                    setNote(
                        "registerNote",
                        "Não foi possível concluir o cadastro. Verifique sua conexão e tente novamente."
                    );

                }

            } else {

                // ==========================================
                // MODO LOCAL
                // ==========================================

                const users =
                    getUsers();


                // ------------------------------------------
                // E-MAIL DUPLICADO
                // ------------------------------------------

                if (
                    users.some(
                        user =>
                            user.email === email
                    )
                ) {

                    setNote(
                        "registerNote",
                        "Este e-mail já está cadastrado."
                    );

                    return;
                }


                // ------------------------------------------
                // NOME DUPLICADO
                // ------------------------------------------

                if (
                    users.some(
                        user =>
                            String(
                                user.name || ""
                            )
                                .trim()
                                .toLowerCase() ===
                            name.toLowerCase()
                    )
                ) {

                    setNote(
                        "registerNote",
                        "Este nome de usuário já está em uso."
                    );

                    return;
                }


                // ------------------------------------------
                // CRIA USUÁRIO
                // ------------------------------------------

                const newUser = {

                    id: Date.now(),

                    name,

                    email,

                    password,

                    profile

                };


                users.push(newUser);


                database.saveUsers(
                    users
                );


                // ------------------------------------------
                // CRIA SESSÃO
                // ------------------------------------------

                database.saveSession({

                    id: newUser.id,

                    name: newUser.name,

                    email: newUser.email,

                    avatar: null,

                    profile: newUser.profile

                });


                formElement.reset();

                closeAuth();


                // ------------------------------------------
                // REDIRECIONA
                // ------------------------------------------

                if (
                    profile ===
                    "comerciante"
                ) {

                    window.location.href =
                        "cadastro-loja.html";

                } else {

                    window.location.href =
                        "cliente.html";
                }

            }

        } finally {

            formElement.dataset.submitting =
                "false";
        }

    });
// ======================================================
// LOGIN
// ======================================================

document
    .getElementById("loginForm")
    .addEventListener("submit", async event => {

        event.preventDefault();

        // Guarda o formulário ANTES de qualquer await: depois de um
        // await, event.currentTarget já volta a ser null.
        const formElement = event.currentTarget;
        const form =
            new FormData(formElement);


        const email =
            form.get("email")
                .trim()
                .toLowerCase();


        const password =
            form.get("password");

        if (API_ENABLED) {
            await legacyUsersSync;
            await syncLegacyUsers();
        }


        let user = getUsers().find(item =>
            item.email === email &&
            item.password === password
        );

        if (API_ENABLED) {
            try {
                const response = await fetchWithRetry(
                    "/api/auth/login",
                    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) },
                    { onRetry: () => setNote("loginNote", "O servidor está iniciando, aguarde alguns segundos...") }
                );
                if (response.ok) {
                    user = (await response.json()).user;
                    const storeResponse = await fetch(`/api/stores/${encodeURIComponent(user.id)}`, { cache: "no-store" });
                    const storeData = storeResponse.ok ? await storeResponse.json() : { store: null };
                    if (storeData.store) {
                        const stores = database.getStores();
                        stores[user.id] = storeData.store;
                        database.saveStores(stores);
                    }
                } else if (!user) {
                    const localUser = getUsers().find(item => item.email === email);
                    setNote("loginNote", localUser ? "Esta conta ainda não foi publicada. Abra este mesmo link no dispositivo onde a conta foi criada e tente novamente." : "E-mail ou senha inválidos.");
                    return;
                }
            } catch (error) {
                if (!user) {
                    setNote("loginNote", "Não foi possível conectar ao servidor. Verifique sua internet e tente novamente em instantes.");
                    return;
                }
            }
        }


        // Usuário não encontrado

        if (!user) {

            setNote(
                "loginNote",
                "E-mail ou senha inválidos."
            );

            return;
        }


        // ==================================================
        // CONTA "ADMIN": não redireciona direto — deixa a
        // pessoa escolher se quer entrar como cliente ou como
        // comerciante (ver showAdminChooser mais abaixo).
        // ==================================================

        if (user.profile === "admin") {

            showAdminChooser(user);

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

            let stores = database.getStores();
            if (API_ENABLED) {
                try {
                    const storeResponse = await fetch(`/api/stores/${encodeURIComponent(user.id)}`, { cache: "no-store" });
                    const storeData = await storeResponse.json();
                    if (storeData.store) { stores = { ...stores, [user.id]: storeData.store }; database.saveStores(stores); }
                } catch (error) { /* usa o cache local */ }
            }

            // Primeiro acesso deste comerciante: ele ainda não
            // configurou o nome e o segmento da loja. Antes de ver
            // a tela inicial do comerciante, precisa preencher isso.
            window.location.href = stores[user.id]
                ? "inicio_comerciante.html"
                : "cadastro-loja.html";

        } else {

            // Fecha modal
            closeAuth();

            closeAuth();
            window.location.href = "cliente.html";

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