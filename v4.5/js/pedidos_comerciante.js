const ordersList = document.getElementById("ordersList");
const ordersNote = document.getElementById("ordersNote");
const session = window.comercianteSession;
const statuses = ["recebido", "preparando", "postado", "enviado", "entregue", "cancelado"];
const labels = { recebido: "Recebido", preparando: "Preparando", postado: "Postado", enviado: "Enviado", entregue: "Entregue", cancelado: "Cancelado" };
const orderDetailsModal = document.getElementById("orderDetailsModal");
const orderDetailsContent = document.getElementById("orderDetailsContent");

function escapeHtml(value) { return String(value || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;"); }
function money(value) { return `R$ ${Number(value || 0).toFixed(2).replace(".", ",")}`; }

async function loadOrders() {
    try {
        const response = await fetch(`/api/orders?merchantId=${encodeURIComponent(session.id)}`, { cache: "no-store" });
        if (!response.ok) throw new Error("Pedidos indisponíveis");
        const data = await response.json();
        renderOrders(data.orders || []);
    } catch (error) {
        ordersNote.textContent = "Não foi possível carregar os pedidos agora.";
        ordersList.innerHTML = `<div class="empty-orders">Tente atualizar a página em alguns instantes.</div>`;
    }
}

function renderOrders(orders) {
    ordersNote.textContent = orders.length ? `${orders.length} pedido(s)` : "";
    if (!orders.length) { ordersList.innerHTML = `<div class="empty-orders">Nenhum pedido recebido ainda.</div>`; return; }
    ordersList.innerHTML = orders.sort((first, second) => second.createdAt - first.createdAt).map(order => {
        const items = order.items;
        return `<article class="order-card" tabindex="0" data-order-id="${escapeHtml(order.id)}"><div class="order-top"><div><h2>Pedido #${escapeHtml(order.id.slice(0, 8).toUpperCase())}</h2><p class="order-client">Cliente: ${escapeHtml(order.clientName)}</p><p class="order-date">${new Date(order.createdAt).toLocaleString("pt-BR")}</p></div><span class="order-status">${escapeHtml(labels[order.status] || order.status)}</span></div><p class="order-summary">${items.length} item(ns) da sua loja · toque para ver detalhes</p><div class="order-actions"><select class="order-status-select" data-order-id="${escapeHtml(order.id)}">${statuses.map(status => `<option value="${status}" ${status === order.status ? "selected" : ""}>${labels[status]}</option>`).join("")}</select><button class="save-status" data-order-id="${escapeHtml(order.id)}" type="button">Atualizar status</button>${order.status === "entregue" ? `<button class="delete-order" data-order-id="${escapeHtml(order.id)}" type="button">Apagar pedido</button>` : ""}</div></article>`;
    }).join("");
    ordersList.querySelectorAll(".save-status").forEach(button => button.addEventListener("click", () => updateStatus(button.dataset.orderId)));
    ordersList.querySelectorAll(".delete-order").forEach(button => button.addEventListener("click", async event => { event.stopPropagation(); const response = await fetch(`/api/orders/${encodeURIComponent(button.dataset.orderId)}`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ merchantId: session.id }) }); if (response.ok) loadOrders(); }));
    ordersList.querySelectorAll(".order-card").forEach(card => { const open = () => openOrderDetails(card.dataset.orderId, orders); card.addEventListener("click", event => { if (!event.target.closest(".order-actions")) open(); }); card.addEventListener("keydown", event => { if ((event.key === "Enter" || event.key === " ") && !event.target.closest(".order-actions")) { event.preventDefault(); open(); } }); });
}

function openOrderDetails(orderId, orders) {
    const order = orders.find(item => item.id === orderId);
    if (!order) return;
    orderDetailsContent.innerHTML = `<h2 id="orderDetailsTitle">Pedido #${escapeHtml(order.id.slice(0, 8).toUpperCase())}</h2><p class="order-client">Cliente: ${escapeHtml(order.clientName)}</p><p class="order-date">${new Date(order.createdAt).toLocaleString("pt-BR")}</p><h3>Produtos da sua loja</h3>${order.items.map(item => `<div class="order-detail-item"><span>${escapeHtml(item.name)}<small>Quantidade: ${item.quantity}</small></span><strong>${money(item.price * item.quantity)}</strong></div>`).join("")}<div class="order-total"><span>Total da sua loja</span><strong>${money(order.total)}</strong></div>`;
    orderDetailsModal.hidden = false;
}

async function updateStatus(orderId) {
    const select = ordersList.querySelector(`.order-status-select[data-order-id="${CSS.escape(orderId)}"]`);
    try {
        const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: select.value }) });
        if (!response.ok) throw new Error("Status indisponível");
        ordersNote.textContent = "Status do pedido atualizado.";
        await loadOrders();
    } catch (error) { ordersNote.textContent = "Não foi possível atualizar o status."; }
}

document.querySelectorAll(".nav-item").forEach(item => item.addEventListener("click", () => { if (item.dataset.page) window.location.href = item.dataset.page; }));
loadOrders();
setInterval(loadOrders, 10000);
document.getElementById("closeOrderDetails").addEventListener("click", () => { orderDetailsModal.hidden = true; });
orderDetailsModal.addEventListener("click", event => { if (event.target === orderDetailsModal) orderDetailsModal.hidden = true; });
