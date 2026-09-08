const CHAT_DATABASE_KEY = "modaCenterChats";
const SESSION_KEY = "modaCenterSession";
const PRESENCE_KEY = "modaCenterPresence";
const PRESENCE_TIMEOUT = 45000;
const API_ENABLED = window.location.protocol !== "file:";

const currentUser = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
const isMerchant = currentUser?.profile === "comerciante";

if (!currentUser) {
    window.location.href = "index.html?login=1";
}
const conversationsList = document.getElementById("conversationsList");
const chatSearch = document.getElementById("chatSearch");
const newChatButton = document.getElementById("newChatButton");
const newChatModal = document.getElementById("newChatModal");
const closeNewChat = document.getElementById("closeNewChat");
const conversationPage = document.getElementById("conversationPage");
const backToChats = document.getElementById("backToChats");
const messagesContainer = document.getElementById("messagesContainer");
const messageForm = document.getElementById("messageForm");
const messageInput = document.getElementById("messageInput");
const conversationName = document.getElementById("conversationName");
const conversationStatus = document.getElementById("conversationStatus");
const conversationAvatar = document.getElementById("conversationAvatar");
let currentConversationId = null;
let messageMenu = null;

function getChats() {
    try {
        const data = JSON.parse(localStorage.getItem(CHAT_DATABASE_KEY) || "[]");
        return Array.isArray(data) ? data : [];
    } catch (error) { return []; }
}

function saveChats(chats) {
    localStorage.setItem(CHAT_DATABASE_KEY, JSON.stringify(chats));
}

async function syncChats() {
    if (!API_ENABLED || !currentUser) return;
    try {
        const response = await fetch(`/api/chats?userId=${encodeURIComponent(currentUser.id)}`, { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json();
        const remoteChats = Array.isArray(data.chats) ? data.chats : [];
        const localChats = getVisibleChats();
        if (!remoteChats.length && localChats.length && !localStorage.getItem("modaCenterChatsMigrated")) {
            await Promise.all(localChats.map(chat => sendChatToServer(chat)));
            localStorage.setItem("modaCenterChatsMigrated", "true");
            return syncChats();
        }
        saveChats(remoteChats);
        renderConversations(chatSearch.value);
        if (currentConversationId) {
            const chat = getChats().find(item => item.id === currentConversationId);
            if (chat) renderMessages(chat);
        }
    } catch (error) {
        // Mantem o cache local se a API estiver temporariamente indisponivel.
    }
}

async function sendChatToServer(chat) {
    if (!API_ENABLED) return;
    const response = await fetch("/api/chats", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(chat) });
    if (!response.ok) throw new Error("Conversa nao sincronizada");
}

async function sendMessageToServer(chat, message, recipientId) {
    if (!API_ENABLED) return;
    const response = await fetch(`/api/chats/${encodeURIComponent(chat.id)}/messages`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...message, recipientId }) });
    if (!response.ok) throw new Error("Mensagem nao enviada");
}

function getPresence() {
    try { return JSON.parse(localStorage.getItem(PRESENCE_KEY) || "{}"); }
    catch (error) { return {}; }
}

function updatePresence(status = "online") {
    const presence = getPresence();
    presence[String(currentUser?.id || "guest")] = { status, lastSeen: Date.now() };
    localStorage.setItem(PRESENCE_KEY, JSON.stringify(presence));
    if (API_ENABLED && currentUser) {
        fetch("/api/presence", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: currentUser.id, status }) }).catch(() => {});
    }
}

async function syncPresence() {
    if (!API_ENABLED) return;
    try {
        const response = await fetch("/api/presence", { cache: "no-store" });
        if (response.ok) localStorage.setItem(PRESENCE_KEY, JSON.stringify((await response.json()).presence || {}));
    } catch (error) {
        // Usa o ultimo estado conhecido.
    }
}

function getOtherId(chat) { return isMerchant ? chat.clientId : chat.merchantId; }
function getOtherName(chat) { return isMerchant ? chat.clientName : chat.merchantName; }
function getOtherAvatar(chat) { return isMerchant ? (chat.clientAvatar || "👤") : (chat.merchantAvatar || "🏪"); }
function getOtherStatus(chat) {
    const record = getPresence()[String(getOtherId(chat))];
    return record && Date.now() - record.lastSeen < PRESENCE_TIMEOUT ? "online" : "offline";
}
function getVisibleChats() {
    return getChats().filter(chat => isMerchant
        ? String(chat.merchantId) === String(currentUser?.id)
        : String(chat.clientId) === String(currentUser?.id));
}
function getUnreadCount(chat) {
    const counts = chat.unreadCounts || {};
    const currentId = String(currentUser?.id);
    if (Number.isFinite(Number(counts[currentId]))) return Number(counts[currentId]);
    return chat.unreadFor === currentId ? 1 : 0;
}
function getTotalUnreadCount() { return getVisibleChats().reduce((total, chat) => total + getUnreadCount(chat), 0); }
function renderChatBadge() {
    const chatButton = [...document.querySelectorAll(".nav-item")].find(button => button.dataset.page === "chat_comerciante.html");
    if (!chatButton) return;
    let badge = chatButton.querySelector(".chat-unread-badge");
    const total = getTotalUnreadCount();
    if (!total) { badge?.remove(); return; }
    if (!badge) {
        badge = document.createElement("span");
        badge.className = "chat-unread-badge";
        badge.setAttribute("aria-label", `${total} mensagens não lidas`);
        chatButton.appendChild(badge);
    }
    badge.textContent = total > 99 ? "99+" : String(total);
}
function getLastMessage(chat) { return chat.messages?.length ? chat.messages[chat.messages.length - 1].text : "Nenhuma mensagem ainda."; }
function getTime(date = new Date()) { return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }); }
function escapeHTML(text) { const div = document.createElement("div"); div.textContent = text; return div.innerHTML; }

async function updateConversation(chat, action) {
    const chats = getChats();
    if (action === "delete") saveChats(chats.filter(item => item.id !== chat.id));
    if (action === "pin") { chat.pinned = !chat.pinned; saveChats(chats); }
    if (API_ENABLED) {
        const method = action === "delete" ? "DELETE" : "PATCH";
        const response = await fetch(`/api/chats/${encodeURIComponent(chat.id)}`, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, actorId: currentUser.id, pinned: chat.pinned }) });
        if (!response.ok) throw new Error("Conversa nao atualizada");
    }
    if (currentConversationId === chat.id && action === "delete") { conversationPage.classList.remove("open"); currentConversationId = null; }
    renderConversations(chatSearch.value);
}
function messageBelongsToCurrentUser(message) {
    if (message.senderId !== undefined && message.senderId !== null) {
        return String(message.senderId) === String(currentUser?.id);
    }
    if (message.sender === "client") return !isMerchant;
    if (message.sender === "seller" || message.sender === "merchant") return isMerchant;
    return false;
}

function closeMessageMenu() {
    messageMenu?.remove();
    messageMenu = null;
}

async function updateMessage(chat, message, action, text = "") {
    if (action === "delete") chat.messages = chat.messages.filter(item => String(item.id) !== String(message.id));
    if (action === "edit" && text) { message.text = text; message.edited = true; }
    if (action === "pin") message.pinned = !message.pinned;
    chat.updatedAt = Date.now();
    saveChats(getChats().map(item => item.id === chat.id ? chat : item));
    if (API_ENABLED) {
        const method = action === "delete" ? "DELETE" : "PATCH";
        await fetch(`/api/chats/${encodeURIComponent(chat.id)}/messages/${encodeURIComponent(message.id)}`, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, actorId: currentUser.id, pinned: message.pinned, text }) });
    }
    renderMessages(chat);
    renderConversations(chatSearch.value);
}

function showMessageMenu(element, chat, message) {
    closeMessageMenu();
    messageMenu = document.createElement("div");
    messageMenu.className = "message-menu";
    const ownMessage = messageBelongsToCurrentUser(message);
    messageMenu.innerHTML = `${ownMessage ? `<button type="button" data-action="edit">Editar</button><button type="button" data-action="delete">Apagar</button>` : ""}<button type="button" data-action="pin">${message.pinned ? "Desafixar" : "Fixar"}</button>`;
    document.body.appendChild(messageMenu);
    const bounds = element.getBoundingClientRect();
    messageMenu.style.top = `${Math.min(window.innerHeight - messageMenu.offsetHeight - 8, Math.max(8, bounds.top - messageMenu.offsetHeight - 6))}px`;
    messageMenu.style.left = `${Math.min(window.innerWidth - messageMenu.offsetWidth - 8, Math.max(8, bounds.left))}px`;
    messageMenu.querySelectorAll("button").forEach(button => button.addEventListener("click", async () => {
        const action = button.dataset.action;
        closeMessageMenu();
        if (action === "delete" && !window.confirm("Apagar esta mensagem?")) return;
        const text = action === "edit" ? window.prompt("Edite sua mensagem:", message.text)?.trim() : "";
        if (action === "edit" && !text) return;
        await updateMessage(chat, message, action, text);
    }));
}

function showConversationMenu(element, chat) {
    closeMessageMenu();
    messageMenu = document.createElement("div");
    messageMenu.className = "message-menu conversation-menu";
    messageMenu.innerHTML = `<button type="button" data-action="pin">${chat.pinned ? "Desafixar conversa" : "Fixar conversa"}</button><button type="button" data-action="delete">Excluir conversa e mensagens</button>`;
    document.body.appendChild(messageMenu);
    const bounds = element.getBoundingClientRect();
    messageMenu.style.top = `${Math.min(window.innerHeight - messageMenu.offsetHeight - 8, Math.max(8, bounds.bottom + 5))}px`;
    messageMenu.style.left = `${Math.min(window.innerWidth - messageMenu.offsetWidth - 8, Math.max(8, bounds.right - messageMenu.offsetWidth))}px`;
    messageMenu.querySelectorAll("button").forEach(button => button.addEventListener("click", async () => {
        const action = button.dataset.action;
        closeMessageMenu();
        if (action === "delete" && !window.confirm("Excluir esta conversa?")) return;
        await updateConversation(chat, action);
    }));
}

function renderConversations(filter = "") {
    const search = filter.trim().toLowerCase();
    const chats = getVisibleChats()
        .filter(chat => getOtherName(chat).toLowerCase().includes(search) || getLastMessage(chat).toLowerCase().includes(search))
        .sort((first, second) => Number(second.pinned) - Number(first.pinned) || (second.updatedAt || 0) - (first.updatedAt || 0));
    conversationsList.innerHTML = chats.length ? "" : `<div class="empty-chat">Nenhuma mensagem de cliente ainda.</div>`;
    if (!chats.length) { renderChatBadge(); return; }
    chats.forEach(chat => {
        const last = chat.messages?.[chat.messages.length - 1];
        const status = getOtherStatus(chat);
        const card = document.createElement("article");
        card.className = "conversation-card";
        const unreadCount = getUnreadCount(chat);
        card.innerHTML = `<div class="avatar">${getOtherAvatar(chat)}</div><div class="conversation-info"><div class="conversation-info-top"><h3>${chat.pinned ? "📌 " : ""}${escapeHTML(getOtherName(chat))}</h3><span class="conversation-time">${last?.time || ""}</span></div><p class="last-message">${escapeHTML(getLastMessage(chat))}</p><span class="status ${status}">● ${status === "online" ? "Online" : "Offline"}</span></div>${unreadCount ? `<div class="unread" aria-label="${unreadCount} mensagens não lidas">${unreadCount > 99 ? "99+" : unreadCount}</div>` : ""}<button class="conversation-options" type="button" aria-label="Opções da conversa">⋮</button>`;
        card.addEventListener("click", () => openConversation(chat.id));
        card.querySelector(".conversation-options").addEventListener("click", event => {
            event.stopPropagation();
            showConversationMenu(event.currentTarget, chat);
        });
        conversationsList.appendChild(card);
    });
    renderChatBadge();
}

function openConversation(chatId) {
    const chats = getChats();
    const chat = chats.find(item => item.id === chatId);
    if (!chat) return;
    currentConversationId = chatId;
    chat.unreadFor = null;
    chat.unreadCounts = chat.unreadCounts || {};
    chat.unreadCounts[String(currentUser.id)] = 0;
    saveChats(chats);
    conversationName.textContent = getOtherName(chat);
    conversationAvatar.textContent = getOtherAvatar(chat);
    conversationStatus.textContent = getOtherStatus(chat) === "online" ? "Online" : "Offline";
    conversationStatus.className = getOtherStatus(chat);
    renderMessages(chat);
    conversationPage.classList.add("open");
    setTimeout(() => messageInput.focus(), 100);
}

function renderMessages(chat) {
    messagesContainer.innerHTML = "";
    (chat.messages || []).forEach(message => {
        const element = document.createElement("div");
        element.className = `message ${messageBelongsToCurrentUser(message) ? "sent" : "received"}`;
        element.innerHTML = `${message.pinned ? `<span class="pinned-label">Fixada</span>` : ""}<span>${escapeHTML(message.text)}${message.edited ? " <small>(editada)</small>" : ""}</span><span class="message-time">${message.time}</span>`;
        let pressTimer;
        element.addEventListener("pointerdown", () => { pressTimer = window.setTimeout(() => showMessageMenu(element, chat, message), 550); });
        element.addEventListener("pointerup", () => window.clearTimeout(pressTimer));
        element.addEventListener("pointerleave", () => window.clearTimeout(pressTimer));
        element.addEventListener("contextmenu", event => { event.preventDefault(); showMessageMenu(element, chat, message); });
        messagesContainer.appendChild(element);
    });
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

messageForm.addEventListener("submit", async event => {
    event.preventDefault();
    const text = messageInput.value.trim();
    if (!text) return;
    const chats = getChats();
    const chat = chats.find(item => item.id === currentConversationId);
    if (!chat) return;
    chat.messages ||= [];
    const message = { id: Date.now(), senderId: currentUser.id, text, time: getTime() };
    chat.messages.push(message);
    chat.updatedAt = Date.now();
    const recipientId = isMerchant ? String(chat.clientId) : String(chat.merchantId);
    chat.unreadCounts = chat.unreadCounts || {};
    chat.unreadCounts[recipientId] = Number(chat.unreadCounts[recipientId] || 0) + 1;
    chat.unreadFor = recipientId;
    saveChats(chats);
    try {
        await sendChatToServer({ ...chat, messages: [] });
        await sendMessageToServer(chat, message, recipientId);
    } catch (error) {
        await syncChats();
        window.alert("Não foi possível enviar a mensagem. Verifique se o servidor está ligado.");
    }
    messageInput.value = "";
    renderMessages(chat);
    renderConversations(chatSearch.value);
});

backToChats.addEventListener("click", () => {
    conversationPage.classList.remove("open");
    currentConversationId = null;
    renderConversations(chatSearch.value);
});

newChatButton.addEventListener("click", () => newChatModal.classList.add("open"));
closeNewChat.addEventListener("click", () => newChatModal.classList.remove("open"));
newChatModal.addEventListener("click", event => { if (event.target === newChatModal) newChatModal.classList.remove("open"); });

document.querySelectorAll(".seller-option").forEach(button => button.addEventListener("click", () => {
    const chats = getChats();
    let chat = chats.find(item => String(item.merchantId) === String(button.dataset.id) && String(item.clientId) === String(currentUser?.id));
    if (!chat) {
        chat = { id: `chat-${Date.now()}`, clientId: currentUser.id, clientName: currentUser.name || "Cliente", clientAvatar: "👤", merchantId: button.dataset.id, merchantName: button.dataset.seller, merchantAvatar: "🏪", messages: [], unreadCounts: {}, updatedAt: Date.now() };
        chats.unshift(chat);
        saveChats(chats);
        sendChatToServer(chat).catch(() => {});
    }
    newChatModal.classList.remove("open");
    renderConversations();
    openConversation(chat.id);
}));

chatSearch.addEventListener("input", () => renderConversations(chatSearch.value));
document.addEventListener("click", event => { if (!event.target.closest(".message-menu")) closeMessageMenu(); });
document.querySelector(".conversation-header .conversation-options")?.addEventListener("click", event => {
    const chat = getChats().find(item => item.id === currentConversationId);
    if (chat) showConversationMenu(event.currentTarget, chat);
});
document.querySelectorAll(".nav-item").forEach(button => button.addEventListener("click", () => { if (button.dataset.page) window.location.href = button.dataset.page; }));

function openRequestedConversation() {
    const merchantId = new URLSearchParams(window.location.search).get("merchant");
    if (!merchantId || isMerchant) return;
    const chats = getChats();
    let chat = chats.find(item => String(item.merchantId) === String(merchantId) && String(item.clientId) === String(currentUser?.id));
    if (!chat) {
        const stores = JSON.parse(localStorage.getItem("modaCenterStores") || "{}");
        chat = { id: `chat-${Date.now()}`, clientId: currentUser.id, clientName: currentUser.name || "Cliente", clientAvatar: "👤", merchantId, merchantName: stores[merchantId]?.name || "Loja", merchantAvatar: "🏪", messages: [], unreadCounts: {}, updatedAt: Date.now() };
        chats.unshift(chat);
        saveChats(chats);
        sendChatToServer(chat).catch(() => {});
    }
    openConversation(chat.id);
}

const clientChatNavigation = document.getElementById("clientChatNavigation");
if (isMerchant) {
    newChatButton.hidden = true;
    clientChatNavigation.hidden = true;
} else {
    newChatButton.hidden = true;
    document.querySelector(".merchant-chat-navigation").hidden = true;
    document.querySelector(".quick-help").hidden = true;
    document.getElementById("filterButton").hidden = true;
    document.getElementById("bottomAdd").hidden = true;
    clientChatNavigation.hidden = false;
    const carts = JSON.parse(localStorage.getItem("modaCenterCart") || "{}");
    document.getElementById("clientChatCartCount").textContent = (carts[currentUser.id] || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    const refreshClientNavigation = () => {
        const latestCarts = JSON.parse(localStorage.getItem("modaCenterCart") || "{}");
        document.getElementById("clientChatCartCount").textContent = (latestCarts[currentUser.id] || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    };
    window.addEventListener("storage", refreshClientNavigation);
    setInterval(refreshClientNavigation, 3000);
}
updatePresence();
window.addEventListener("pagehide", () => updatePresence("offline"));
window.addEventListener("storage", event => {
    if (event.key !== CHAT_DATABASE_KEY && event.key !== PRESENCE_KEY) return;
    renderConversations(chatSearch.value);
    if (currentConversationId) {
        const chat = getChats().find(item => item.id === currentConversationId);
        if (chat) { renderMessages(chat); conversationStatus.textContent = getOtherStatus(chat) === "online" ? "Online" : "Offline"; }
    }
});
setInterval(() => { updatePresence(); renderConversations(chatSearch.value); }, 5000);
setInterval(() => { void syncChats(); void syncPresence(); }, 3000);
renderConversations();
openRequestedConversation();
void syncChats();
void syncPresence();
