// =========================================================
// CHAT (chat_vendedor.html)
// =========================================================
// Simula uma tela de conversas entre cliente e vendedor, tudo
// guardado no localStorage (não existe servidor nem envio real
// de mensagens entre dispositivos diferentes).
//
// Estrutura dos dados salvos em "modaCenterChats":
//   { "<idDoUsuario>": [ { id, sellerId, sellerName, avatar,
//                          status, statusText, unread,
//                          messages: [{id, sender, text, time}] } ] }
//
// Cada usuário logado tem sua própria lista de conversas,
// identificada pelo id salvo na sessão (ou "guest" se não
// houver sessão ativa).
//
// CORREÇÃO DE BUG: este arquivo antes estava salvo dentro da
// pasta css/ por engano, então chat_vendedor.html (que pede
// "js/chat_vendedor.js")
// nunca conseguia carregá-lo e a tela de chat inteira ficava
// sem nenhuma função. Ele foi movido para js/chat_vendedor.js.
// =========================================================

// =========================================================
// CONFIGURAÇÃO
// =========================================================

const CHAT_DATABASE_KEY = "modaCenterChats";

const SESSION_KEY = "modaCenterSession";


// =========================================================
// ELEMENTOS
// =========================================================

const conversationsList =
    document.getElementById("conversationsList");

const chatSearch =
    document.getElementById("chatSearch");

const newChatButton =
    document.getElementById("newChatButton");

const newChatModal =
    document.getElementById("newChatModal");

const closeNewChat =
    document.getElementById("closeNewChat");

const conversationPage =
    document.getElementById("conversationPage");

const backToChats =
    document.getElementById("backToChats");

const messagesContainer =
    document.getElementById("messagesContainer");

const messageForm =
    document.getElementById("messageForm");

const messageInput =
    document.getElementById("messageInput");

const conversationName =
    document.getElementById("conversationName");

const conversationStatus =
    document.getElementById("conversationStatus");

const conversationAvatar =
    document.getElementById("conversationAvatar");

const typingIndicator =
    document.getElementById("typingIndicator");


// =========================================================
// USUÁRIO LOGADO
// =========================================================

function getCurrentUser() {

    try {

        const session =
            JSON.parse(
                localStorage.getItem(SESSION_KEY)
            );

        return session;

    } catch (error) {

        return null;

    }

}


const currentUser = getCurrentUser();


// =========================================================
// BANCO DE CHAT
// =========================================================

function getChats() {

    try {

        const chats =
            JSON.parse(
                localStorage.getItem(
                    CHAT_DATABASE_KEY
                ) || "{}"
            );

        return chats;

    } catch (error) {

        return {};

    }

}


function saveChats(chats) {

    localStorage.setItem(
        CHAT_DATABASE_KEY,
        JSON.stringify(chats)
    );

}


// =========================================================
// CHAVE DO USUÁRIO
// =========================================================

function getUserChatKey() {

    if (currentUser && currentUser.id) {

        return String(currentUser.id);

    }

    return "guest";

}


// =========================================================
// CONVERSAS DO USUÁRIO
// =========================================================

function getUserChats() {

    const database = getChats();

    const key = getUserChatKey();

    if (!database[key]) {

        database[key] = [];

        saveChats(database);

    }

    return database[key];

}


function saveUserChats(chats) {

    const database = getChats();

    database[getUserChatKey()] = chats;

    saveChats(database);

}


// =========================================================
// CONVERSA ATUAL
// =========================================================

let currentConversationId = null;


// =========================================================
// DATA / HORA
// =========================================================

function getTime(date = new Date()) {

    return date.toLocaleTimeString(
        "pt-BR",
        {
            hour: "2-digit",
            minute: "2-digit"
        }
    );

}


// =========================================================
// CONVERSAS INICIAIS
// =========================================================

function createInitialChats() {

    const chats = getUserChats();


    if (chats.length > 0) {

        return;

    }


    const initialChats = [

        {
            id: "chat-ailton",

            sellerId: "seller-1",

            sellerName: "Ailton Borges",

            avatar: "👨🏻‍💼",

            status: "online",

            statusText: "Online",

            messages: [

                {
                    id: 1,

                    sender: "seller",

                    text: "Olá, tem camisa M? Quero saber se ainda tem disponível.",

                    time: "09:41"

                },

                {
                    id: 2,

                    sender: "seller",

                    text: "Também posso te mostrar alguns modelos novos.",

                    time: "09:42"

                }

            ],

            unread: 2

        },


        {
            id: "chat-clara",

            sellerId: "seller-2",

            sellerName: "Clara Mendes",

            avatar: "👩🏻",

            status: "away",

            statusText: "Aguardando",

            messages: [

                {
                    id: 1,

                    sender: "seller",

                    text: "A camisa M veste 38?",

                    time: "13:43"

                }

            ],

            unread: 1

        },


        {
            id: "chat-theodoro",

            sellerId: "seller-3",

            sellerName: "Theodoro Alencar",

            avatar: "👨🏻‍🦰",

            status: "offline",

            statusText: "Offline",

            messages: [

                {
                    id: 1,

                    sender: "seller",

                    text: "Vai ter reposição do mesmo modelo?",

                    time: "17:54"

                }

            ],

            unread: 1

        },


        {
            id: "chat-luiz",

            sellerId: "seller-4",

            sellerName: "Luiz Felipe",

            avatar: "👨🏻",

            status: "online",

            statusText: "Online",

            messages: [

                {
                    id: 1,

                    sender: "seller",

                    text: "Tem calça 44 deste modelo?",

                    time: "19:40"

                }

            ],

            unread: 3

        }

    ];


    saveUserChats(initialChats);

}


// =========================================================
// ÚLTIMA MENSAGEM
// =========================================================

function getLastMessage(chat) {

    if (
        !chat.messages ||
        chat.messages.length === 0
    ) {

        return "Nenhuma mensagem ainda.";

    }


    return chat
        .messages[
            chat.messages.length - 1
        ]
        .text;

}


// =========================================================
// RENDERIZA LISTA
// =========================================================

function renderConversations(filter = "") {

    const chats = getUserChats();


    conversationsList.innerHTML = "";


    const search =
        filter
            .trim()
            .toLowerCase();


    const filteredChats =
        chats.filter(chat =>

            chat.sellerName
                .toLowerCase()
                .includes(search)

            ||

            getLastMessage(chat)
                .toLowerCase()
                .includes(search)

        );


    if (filteredChats.length === 0) {

        conversationsList.innerHTML = `

            <div class="empty-chat">

                Nenhuma conversa encontrada.

            </div>

        `;

        return;

    }


    filteredChats.forEach(chat => {

        const lastMessage =
            getLastMessage(chat);


        const lastMessageObject =
            chat.messages[
                chat.messages.length - 1
            ];


        const card =
            document.createElement("article");


        card.className =
            "conversation-card";


        card.dataset.id =
            chat.id;


        card.innerHTML = `

            <div class="avatar">

                ${chat.avatar}

            </div>


            <div class="conversation-info">

                <div class="conversation-info-top">

                    <h3>
                        ${chat.sellerName}
                    </h3>

                    <span class="conversation-time">
                        ${lastMessageObject?.time || ""}
                    </span>

                </div>


                <p class="last-message">

                    ${lastMessage}

                </p>


                <span class="status ${chat.status}">

                    ● ${chat.statusText}

                </span>

            </div>


            ${
                chat.unread > 0
                ?
                `<div class="unread">
                    ${chat.unread}
                </div>`
                :
                ""
            }

        `;


        card.addEventListener(
            "click",
            () => openConversation(chat.id)
        );


        conversationsList.appendChild(card);

    });

}


// =========================================================
// ABRIR CONVERSA
// =========================================================

function openConversation(chatId) {

    const chats =
        getUserChats();


    const chat =
        chats.find(
            item => item.id === chatId
        );


    if (!chat) return;


    currentConversationId =
        chatId;


    conversationName.textContent =
        chat.sellerName;


    conversationStatus.textContent =
        chat.statusText;


    conversationAvatar.textContent =
        chat.avatar;


    // Marca mensagens como lidas

    chat.unread = 0;


    saveUserChats(chats);


    renderMessages(chat);


    conversationPage.classList.add(
        "open"
    );


    setTimeout(() => {

        messageInput.focus();

    }, 100);

}


// =========================================================
// RENDERIZAR MENSAGENS
// =========================================================

function renderMessages(chat) {

    messagesContainer.innerHTML = "";


    chat.messages.forEach(message => {

        const messageElement =
            document.createElement("div");


        messageElement.className =
            `message ${
                message.sender === "client"
                    ? "sent"
                    : "received"
            }`;


        messageElement.innerHTML = `

            <span>
                ${escapeHTML(message.text)}
            </span>

            <span class="message-time">
                ${message.time}
            </span>

        `;


        messagesContainer.appendChild(
            messageElement
        );

    });


    messagesContainer.scrollTop =
        messagesContainer.scrollHeight;

}


// =========================================================
// ENVIAR MENSAGEM
// =========================================================

messageForm.addEventListener(
    "submit",
    event => {

        event.preventDefault();


        const text =
            messageInput.value.trim();


        if (!text) return;


        const chats =
            getUserChats();


        const chat =
            chats.find(
                item =>
                    item.id ===
                    currentConversationId
            );


        if (!chat) return;


        chat.messages.push({

            id: Date.now(),

            sender: "client",

            text: text,

            time: getTime()

        });


        saveUserChats(chats);


        messageInput.value = "";


        renderMessages(chat);


        renderConversations();


        // Simula resposta do vendedor

        simulateSellerResponse(
            chat.id
        );

    }
);


// =========================================================
// RESPOSTA DO VENDEDOR
// =========================================================

function simulateSellerResponse(chatId) {

    typingIndicator.classList.add(
        "show"
    );


    const responses = [

        "Claro! Vou verificar para você.",

        "Temos sim. Vou confirmar o tamanho disponível.",

        "Posso te enviar algumas opções desse modelo.",

        "Perfeito! Vou separar as opções para você.",

        "Vou verificar o estoque e já te respondo.",

        "Temos esse modelo disponível. 😊"

    ];


    const response =
        responses[
            Math.floor(
                Math.random() *
                responses.length
            )
        ];


    setTimeout(() => {

        const chats =
            getUserChats();


        const chat =
            chats.find(
                item =>
                    item.id === chatId
            );


        if (!chat) return;


        chat.messages.push({

            id: Date.now(),

            sender: "seller",

            text: response,

            time: getTime()

        });


        saveUserChats(chats);


        typingIndicator.classList.remove(
            "show"
        );


        renderMessages(chat);

        renderConversations();

    }, 1500);

}


// =========================================================
// VOLTAR PARA LISTA
// =========================================================

backToChats.addEventListener(
    "click",
    () => {

        conversationPage.classList.remove(
            "open"
        );

        currentConversationId = null;

        renderConversations();

    }
);


// =========================================================
// NOVA CONVERSA
// =========================================================

newChatButton.addEventListener(
    "click",
    () => {

        newChatModal.classList.add(
            "open"
        );

    }
);


closeNewChat.addEventListener(
    "click",
    () => {

        newChatModal.classList.remove(
            "open"
        );

    }
);


newChatModal.addEventListener(
    "click",
    event => {

        if (
            event.target ===
            newChatModal
        ) {

            newChatModal.classList.remove(
                "open"
            );

        }

    }
);


// =========================================================
// SELECIONAR VENDEDOR
// =========================================================

document
    .querySelectorAll(".seller-option")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                const sellerName =
                    button.dataset.seller;


                const sellerId =
                    button.dataset.id;


                const chats =
                    getUserChats();


                let existingChat =
                    chats.find(
                        chat =>
                            chat.sellerId ===
                            sellerId
                    );


                if (!existingChat) {

                    existingChat = {

                        id:
                            `chat-${Date.now()}`,

                        sellerId:
                            sellerId,

                        sellerName:
                            sellerName,

                        avatar:
                            "👩🏻",

                        status:
                            "online",

                        statusText:
                            "Online",

                        messages: [

                            {

                                id: Date.now(),

                                sender: "seller",

                                text:
                                    "Olá! Como posso ajudar você?",

                                time:
                                    getTime()

                            }

                        ],

                        unread: 0

                    };


                    chats.unshift(
                        existingChat
                    );


                    saveUserChats(chats);

                }


                newChatModal.classList.remove(
                    "open"
                );


                renderConversations();


                openConversation(
                    existingChat.id
                );

            }
        );

    });


// =========================================================
// PESQUISA
// =========================================================

chatSearch.addEventListener(
    "input",
    () => {

        renderConversations(
            chatSearch.value
        );

    }
);


// =========================================================
// ESCAPAR HTML
// =========================================================

function escapeHTML(text) {

    const div =
        document.createElement("div");


    div.textContent =
        text;


    return div.innerHTML;

}


// =========================================================
// MENU INFERIOR
// =========================================================

document
    .querySelectorAll(".nav-item")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                const page =
                    button.dataset.page;


                if (page) {

                    window.location.href =
                        page;

                }

            }
        );

    });


// =========================================================
// INICIALIZAÇÃO
// =========================================================

createInitialChats();

renderConversations();