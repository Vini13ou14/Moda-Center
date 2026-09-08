const notificationButton = document.getElementById("notificationButton");
const notificationSession = window.comercianteSession;
const notificationStorageKey = "modaCenterNotifications";
const notificationDeletedKey = "modaCenterDeletedNotifications";
let notificationOrders = [];

function readJson(key, fallback) { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch (error) { return fallback; } }
function saveJson(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
function escapeNotification(value) { return String(value || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
function notificationChats() { return readJson("modaCenterChats", []); }
function userNotifications() { return readJson(notificationStorageKey, {})[String(notificationSession.id)] || []; }
function saveUserNotifications(items) { const all = readJson(notificationStorageKey, {}); all[String(notificationSession.id)] = items; saveJson(notificationStorageKey, all); }
function deletedNotifications() { return readJson(notificationDeletedKey, {})[String(notificationSession.id)] || []; }
function unreadMessages() { const userId = String(notificationSession.id); return notificationChats().filter(chat => String(chat.merchantId) === userId).reduce((sum, chat) => sum + Number(chat.unreadCounts?.[userId] || (chat.unreadFor === userId ? 1 : 0)), 0); }

function collectNotifications() {
    const userId = String(notificationSession.id);
    const notifications = userNotifications();
    const deleted = new Set(deletedNotifications());
    notificationChats().filter(chat => String(chat.merchantId) === userId).forEach(chat => {
        const unread = Number(chat.unreadCounts?.[userId] || (chat.unreadFor === userId ? 1 : 0));
        const key = `message-${chat.id}-${unread}`;
        if (unread && !deleted.has(key) && !notifications.some(item => item.id === key)) notifications.unshift({ id: key, type: "message", title: "Nova mensagem", text: `${unread} mensagem(ns) não lida(s) de ${chat.clientName || "cliente"}.`, createdAt: Date.now() });
    });
    notificationOrders.filter(order => order.status === "recebido").forEach(order => {
        const key = `order-${order.id}-${order.status}`;
        if (!deleted.has(key) && !notifications.some(item => item.id === key)) notifications.unshift({ id: key, orderId: order.id, type: "order", title: "Novo pedido", text: `Pedido #${order.id.slice(0, 8).toUpperCase()} de ${order.clientName || "cliente"} aguardando preparo.`, createdAt: order.createdAt });
    });
    saveUserNotifications(notifications.slice(0, 100));
}

function renderNotificationBadge() {
    const deleted = new Set(deletedNotifications());
    const total = userNotifications().filter(item => !deleted.has(item.id) && (item.type === "message" ? unreadMessages() > 0 : notificationOrders.some(order => order.id === item.orderId && order.status === "recebido"))).length;
    let badge = notificationButton.querySelector(".notification-badge");
    if (!total) { badge?.remove(); return; }
    if (!badge) { badge = document.createElement("span"); badge.className = "notification-badge"; notificationButton.appendChild(badge); }
    badge.textContent = total > 99 ? "99+" : String(total);
    badge.setAttribute("aria-label", `${total} notificações não lidas`);
}

function renderNotificationPanel() {
    let panel = document.getElementById("notificationsPanel");
    if (!panel) { panel = document.createElement("section"); panel.id = "notificationsPanel"; panel.className = "notifications-panel"; panel.setAttribute("aria-label", "Notificações"); document.body.appendChild(panel); }
    const deleted = new Set(deletedNotifications());
    const items = userNotifications().filter(item => !deleted.has(item.id));
    panel.innerHTML = `<div class="notifications-heading"><h2>Notificações</h2><button id="clearOldNotifications" type="button">Apagar antigas</button></div>${items.length ? items.map(item => `<article class="notification-entry"><div><strong>${escapeNotification(item.title)}</strong><span>${escapeNotification(item.text)}</span><small>${new Date(item.createdAt).toLocaleString("pt-BR")}</small></div><button class="delete-notification" data-notification-id="${escapeNotification(item.id)}" type="button" aria-label="Apagar notificação">×</button></article>`).join("") : '<p class="notifications-empty">Nenhuma notificação nova.</p>'}`;
    panel.hidden = false;
    panel.querySelectorAll(".delete-notification").forEach(button => button.addEventListener("click", () => { const allDeleted = [...new Set([...deletedNotifications(), button.dataset.notificationId])]; const data = readJson(notificationDeletedKey, {}); data[String(notificationSession.id)] = allDeleted; saveJson(notificationDeletedKey, data); renderNotificationPanel(); renderNotificationBadge(); }));
    panel.querySelector("#clearOldNotifications")?.addEventListener("click", () => { const data = readJson(notificationDeletedKey, {}); data[String(notificationSession.id)] = [...new Set([...deleted, ...items.map(item => item.id)])]; saveJson(notificationDeletedKey, data); renderNotificationPanel(); renderNotificationBadge(); });
}

async function loadNotifications() {
    try { const response = await fetch(`/api/orders?merchantId=${encodeURIComponent(notificationSession.id)}`, { cache: "no-store" }); if (response.ok) notificationOrders = (await response.json()).orders || []; } catch (error) { notificationOrders = []; }
    collectNotifications();
    renderNotificationBadge();
}

notificationButton.addEventListener("click", renderNotificationPanel);
document.addEventListener("click", event => { const panel = document.getElementById("notificationsPanel"); if (panel && !panel.hidden && event.target !== notificationButton && !panel.contains(event.target)) panel.hidden = true; });
window.addEventListener("storage", loadNotifications);
loadNotifications();
setInterval(loadNotifications, 5000);
