const CHAT_BADGE_DATABASE_KEY = "modaCenterChats";
const CHAT_BADGE_SESSION_KEY = "modaCenterSession";

function getChatBadgeSession() {
    try {
        return JSON.parse(localStorage.getItem(CHAT_BADGE_SESSION_KEY) || "null");
    } catch (error) {
        return null;
    }
}

function getChatBadgeChats() {
    try {
        const chats = JSON.parse(localStorage.getItem(CHAT_BADGE_DATABASE_KEY) || "[]");
        return Array.isArray(chats) ? chats : [];
    } catch (error) {
        return [];
    }
}

function getChatBadgeCount(chat, session) {
    const counts = chat.unreadCounts || {};
    const userId = String(session?.id);
    if (Number.isFinite(Number(counts[userId]))) return Number(counts[userId]);
    return chat.unreadFor === userId ? 1 : 0;
}

function updateChatBadge() {
    const session = getChatBadgeSession();
    const button = document.getElementById("clientChatButton") || [...document.querySelectorAll(".nav-item")]
        .find(item => item.dataset.page === "chat_comerciante.html");
    if (!button || !session) return;

    const isMerchant = session.profile === "comerciante";
    const total = getChatBadgeChats()
        .filter(chat => isMerchant
            ? String(chat.merchantId) === String(session.id)
            : String(chat.clientId) === String(session.id))
        .reduce((sum, chat) => sum + getChatBadgeCount(chat, session), 0);

    let badge = button.querySelector(".chat-unread-badge") || button.querySelector("#clientChatCount");
    if (!total) {
        badge?.remove();
        return;
    }

    if (!badge) {
        badge = document.createElement("span");
        badge.className = "chat-unread-badge";
        badge.setAttribute("aria-label", `${total} mensagens não lidas`);
        button.appendChild(badge);
    }
    badge.textContent = total > 99 ? "99+" : String(total);
}

updateChatBadge();
window.addEventListener("storage", event => {
    if (event.key === CHAT_BADGE_DATABASE_KEY || event.key === CHAT_BADGE_SESSION_KEY) updateChatBadge();
});
window.setInterval(updateChatBadge, 3000);
