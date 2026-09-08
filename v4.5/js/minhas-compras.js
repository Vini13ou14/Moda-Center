const session = JSON.parse(localStorage.getItem("modaCenterSession") || "null");
const list = document.getElementById("purchasesList");
const note = document.getElementById("purchasesNote");
const labels = { recebido:"Recebido", preparando:"Preparando", postado:"Postado", enviado:"Saiu para entrega", entregue:"Entregue", cancelado:"Cancelado" };
const icons = { recebido:"🧾", preparando:"📦", postado:"🏷️", enviado:"🚚", entregue:"✅", cancelado:"⚠️" };
function escapeHtml(value) { return String(value || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;"); }
function money(value) { return `R$ ${Number(value || 0).toFixed(2).replace(".",",")}`; }
async function loadPurchases() {
    if (!session || session.profile !== "cliente") { window.location.href = "index.html?login=1"; return; }
    try {
        const response = await fetch(`/api/orders?clientId=${encodeURIComponent(session.id)}`, { cache:"no-store" });
        if (!response.ok) throw new Error("Pedidos indisponíveis");
        const orders = (await response.json()).orders.sort((a,b) => b.createdAt - a.createdAt);
        note.textContent = orders.length ? `${orders.length} compra(s)` : "";
        list.innerHTML = orders.length ? orders.map(order => `<article class="purchase-card" tabindex="0" data-order-id="${escapeHtml(order.id)}"><div class="purchase-summary"><div><h2>Pedido #${escapeHtml(order.id.slice(0,8).toUpperCase())}</h2><p>${order.items.length} item(ns) comprado(s)</p><small>${new Date(order.updatedAt || order.createdAt).toLocaleString("pt-BR")}</small></div><span class="purchase-status">${icons[order.status] || "📦"} ${labels[order.status] || order.status}</span></div><div class="purchase-total"><span>Total</span><strong>${money(order.total)}</strong></div>${["enviado","entregue"].includes(order.status) ? `<button class="confirm-receipt" data-order-id="${escapeHtml(order.id)}" type="button">Confirmar que recebi</button>` : ""}<div class="purchase-details" hidden>${order.items.map(item => `<div class="purchase-item"><span>${escapeHtml(item.name)} x ${item.quantity}</span><strong>${money(item.price * item.quantity)}</strong></div>`).join("")}<p>${order.items.map(item => escapeHtml(item.ownerName || "Loja Moda Center")).filter((value,index,array) => array.indexOf(value) === index).join(" · ")}</p></div></article>`).join("") : `<div class="empty-purchases">Você ainda não fez nenhuma compra.</div>`;
        list.querySelectorAll(".purchase-card").forEach(card => { const toggle = () => { const details = card.querySelector(".purchase-details"); details.hidden = !details.hidden; }; card.addEventListener("click", toggle); card.addEventListener("keydown", event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); toggle(); } }); });
        list.querySelectorAll(".confirm-receipt").forEach(button => button.addEventListener("click", async event => { event.stopPropagation(); const response = await fetch(`/api/orders/${encodeURIComponent(button.dataset.orderId)}/confirm`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clientId: session.id }) }); if (response.ok) { note.textContent = "Recebimento confirmado."; loadPurchases(); } }));
    } catch (error) { note.textContent = "Não foi possível atualizar suas compras."; list.innerHTML = `<div class="empty-purchases">Tente novamente em alguns instantes.</div>`; }
}
loadPurchases();
setInterval(loadPurchases, 5000);
