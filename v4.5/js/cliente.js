const PRODUCTS_KEY = "modaCenterProducts";
const STORES_KEY = "modaCenterStores";
const SESSION_KEY = "modaCenterSession";
const USERS_KEY = "modaCenterUsers";
const PURCHASES_KEY = "modaCenterPurchases";
const CART_KEY = "modaCenterCart";
const PLACEHOLDER = "assets/images/produtos/sem-foto.svg";
const API_ENABLED = window.location.protocol !== "file:";

const session = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
const productsElement = document.getElementById("clientProducts");
const searchElement = document.getElementById("catalogSearch");
const noteElement = document.getElementById("clientNote");
const cartButton = document.getElementById("cartButton");
const cartCountElement = document.getElementById("cartCount");
const cartPanel = document.getElementById("cartPanel");
const cartItemsElement = document.getElementById("cartItems");
const cartTotalElement = document.getElementById("cartTotal");
const checkoutButton = document.getElementById("checkoutButton");
const productDetailsModal = document.getElementById("productDetailsModal");
const productDetailsContent = document.getElementById("productDetailsContent");
const stores = JSON.parse(localStorage.getItem(STORES_KEY) || "{}");
let catalogProducts = [];
let catalogStores = stores;
const deliveredPurchases = new Set();

function updateClientPresence(status = "online") {
    if (!API_ENABLED || !session) return;
    fetch("/api/presence", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: session.id, status }) }).catch(() => {});
}

if (!session || session.profile !== "cliente") {
    window.location.href = "index.html?login=1";
}

document.getElementById("clientGreeting").textContent = `Olá, ${session?.name || "cliente"}. Escolha um produto para comprar.`;

document.getElementById("clientLogout").addEventListener("click", () => {
    updateClientPresence("offline");
    localStorage.removeItem(SESSION_KEY);
    window.location.href = "index.html?login=1";
});

updateClientPresence();
window.setInterval(() => updateClientPresence(), 15000);
window.addEventListener("pagehide", () => updateClientPresence("offline"));

function escapeHtml(value) {
    return String(value || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function readProducts() {
    if (catalogProducts.length) return catalogProducts;
    const allProducts = JSON.parse(localStorage.getItem(PRODUCTS_KEY) || "{}");
    return Object.entries(allProducts).flatMap(([ownerId, products]) => (Array.isArray(products) ? products : []).map(product => ({ ...product, ownerId })));
}

async function loadCatalog() {
    if (!API_ENABLED) return;
    try {
        const response = await fetch("/api/catalog", { cache: "no-store" });
        if (!response.ok) throw new Error("Catalogo indisponivel");
        const data = await response.json();
        catalogProducts = Array.isArray(data.products) ? data.products : [];
        catalogStores = data.stores || {};
        const ordersResponse = await fetch(`/api/orders?clientId=${encodeURIComponent(session.id)}`, { cache: "no-store" });
        if (ordersResponse.ok) {
            const ordersData = await ordersResponse.json();
            ordersData.orders.filter(order => order.status === "entregue").flatMap(order => order.items || []).forEach(item => deliveredPurchases.add(String(item.productId)));
        }
        render();
    } catch (error) {
        noteElement.textContent = "Não foi possível atualizar o catálogo. Exibindo dados locais.";
    }
}

function saveProducts(products) {
    const grouped = {};
    products.forEach(product => {
        grouped[product.ownerId] ||= [];
        const { ownerId, ...data } = product;
        grouped[ownerId].push(data);
    });
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(grouped));
}

function getPurchases() {
    const purchases = JSON.parse(localStorage.getItem(PURCHASES_KEY) || "{}");
    return Array.isArray(purchases[session.id]) ? purchases[session.id] : [];
}

function savePurchase(productId) {
    const purchases = JSON.parse(localStorage.getItem(PURCHASES_KEY) || "{}");
    purchases[session.id] ||= [];
    if (!purchases[session.id].includes(String(productId))) purchases[session.id].push(String(productId));
    localStorage.setItem(PURCHASES_KEY, JSON.stringify(purchases));
}

function getCart() {
    const carts = JSON.parse(localStorage.getItem(CART_KEY) || "{}");
    return Array.isArray(carts[session.id]) ? carts[session.id] : [];
}

function saveCart(cart) {
    const carts = JSON.parse(localStorage.getItem(CART_KEY) || "{}");
    carts[session.id] = cart;
    localStorage.setItem(CART_KEY, JSON.stringify(carts));
}

function getVariations(product) {
    return Array.isArray(product.variations) ? product.variations.filter(variation => variation.color && variation.size) : [];
}

function getVariation(product, variationId) {
    return getVariations(product).find(variation => String(variation.id) === String(variationId));
}

function getCartQuantity(productId, variationId = null) {
    return getCart().filter(item => String(item.productId) === String(productId) && (variationId === null || String(item.variationId || "") === String(variationId))).reduce((total, item) => total + Number(item.quantity || 0), 0);
}

function updateCartCount() {
    const total = getCart().reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    cartCountElement.textContent = total;
}

const orderStatusLabels = { recebido: "Recebido", preparando: "Preparando", postado: "Postado", enviado: "Saiu para entrega", entregue: "Entregue", cancelado: "Cancelado" };
const orderStatusIcons = { recebido: "🧾", preparando: "📦", postado: "🏷️", enviado: "🚚", entregue: "✅", cancelado: "⚠️" };

async function loadClientOrders() {
    return;
}

function ratingSummary(product) {
    const ratings = Array.isArray(product.ratings) ? product.ratings : [];
    const average = ratings.length ? ratings.reduce((sum, rating) => sum + Number(rating.value), 0) / ratings.length : 0;
    return `${average.toFixed(2).replace(".", ",")} ★ (${ratings.length})`;
}

function render() {
    const query = searchElement.value.trim().toLowerCase();
    const products = readProducts().filter(product => String(product.name).toLowerCase().includes(query));

    if (!products.length) {
        productsElement.innerHTML = `<div class="empty-state">Nenhum produto encontrado.</div>`;
        return;
    }

    productsElement.innerHTML = products.map(product => {
        const cartQuantity = getCartQuantity(product.id);
        const stock = Number(product.quantity || 0);
        const storeName = catalogStores[product.ownerId]?.name || product.ownerName || "Loja Moda Center";
        return `<article class="client-card" data-view-product-id="${escapeHtml(product.id)}" tabindex="0" aria-label="Ver detalhes de ${escapeHtml(product.name)}">
            <img src="${escapeHtml(product.image || PLACEHOLDER)}" alt="${escapeHtml(product.name)}" onerror="this.onerror=null;this.src='${PLACEHOLDER}'">
            <div class="client-card-body">
                <h3>${escapeHtml(product.name)}</h3>
                <p class="store-name">${escapeHtml(storeName)}</p>
                <p class="price">R$ ${Number(product.price || 0).toFixed(2).replace(".", ",")}</p>
                <p class="stock">${stock > 0 ? `${stock} em estoque` : "Produto esgotado"}</p>
                <p class="rating">${ratingSummary(product)}</p>
            </div>
        </article>`;
    }).join("");

    productsElement.querySelectorAll(".client-card").forEach(card => {
        const openDetails = () => openProductDetails(card.dataset.viewProductId);
        card.addEventListener("click", openDetails);
        card.addEventListener("keydown", event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openDetails(); } });
    });
    productsElement.querySelectorAll(".buy-button, .rating-button, .chat-button").forEach(element => element.addEventListener("click", event => event.stopPropagation()));
    updateCartCount();
}

function buyProduct(productId, variationId = null, requestedQuantity = 1) {
    const product = readProducts().find(item => String(item.id) === String(productId));
    const cart = getCart();
    const variation = variationId === null ? null : getVariation(product, variationId);
    const item = cart.find(entry => String(entry.productId) === String(productId) && String(entry.variationId || "") === String(variationId || ""));
    const currentQuantity = item?.quantity || 0;
    const stock = variation ? Number(variation.quantity || 0) : Number(product?.quantity || 0);
    const quantity = Math.max(1, Math.floor(Number(requestedQuantity) || 1));
    if (!product || currentQuantity + quantity > stock) return;
    if (item) item.quantity += quantity;
    else cart.push({ productId: String(productId), variationId: variationId === null ? null : String(variationId), quantity });
    saveCart(cart);
    noteElement.textContent = "Produto adicionado ao carrinho.";
    renderCart();
    render();
    cartPanel.hidden = false;
}

function renderCart() {
    const products = readProducts();
    const cart = getCart();
    let total = 0;
    cartItemsElement.innerHTML = "";
    cart.forEach(item => {
        const product = products.find(entry => String(entry.id) === String(item.productId));
        if (!product) return;
        const subtotal = Number(product.price || 0) * Number(item.quantity || 0);
        const variation = getVariation(product, item.variationId);
        const variationLabel = variation ? ` · ${variation.color} / ${variation.size}` : "";
        total += subtotal;
        const element = document.createElement("div");
        element.className = "cart-item";
        element.dataset.productId = product.id;
        element.tabIndex = 0;
        element.dataset.variationId = item.variationId || "";
        element.innerHTML = `<img class="cart-item-image" src="${escapeHtml(product.image || PLACEHOLDER)}" alt="${escapeHtml(product.name)}" onerror="this.onerror=null;this.src='${PLACEHOLDER}'"><div><h3>${escapeHtml(product.name)}</h3><p>${item.quantity} unidade(s)${escapeHtml(variationLabel)} x R$ ${Number(product.price || 0).toFixed(2).replace(".", ",")}</p></div><div><strong>R$ ${subtotal.toFixed(2).replace(".", ",")}</strong><button class="remove-cart-item" type="button" data-product-id="${escapeHtml(product.id)}" data-variation-id="${escapeHtml(item.variationId || "")}">Remover</button></div>`;
        cartItemsElement.appendChild(element);
    });
    if (!cartItemsElement.children.length) cartItemsElement.innerHTML = `<p class="empty-state">Seu carrinho está vazio.</p>`;
    cartTotalElement.textContent = `R$ ${total.toFixed(2).replace(".", ",")}`;
    checkoutButton.disabled = !cart.length;
    updateCartCount();
    cartItemsElement.querySelectorAll(".remove-cart-item").forEach(button => button.addEventListener("click", () => {
        saveCart(getCart().filter(item => !(String(item.productId) === String(button.dataset.productId) && String(item.variationId || "") === String(button.dataset.variationId || ""))));
        renderCart();
        render();
    }));
    cartItemsElement.querySelectorAll(".cart-item").forEach(item => {
        const openDetails = () => openProductDetails(item.dataset.productId);
        item.addEventListener("click", event => { if (!event.target.closest(".remove-cart-item")) openDetails(); });
        item.addEventListener("keydown", event => { if ((event.key === "Enter" || event.key === " ") && !event.target.closest(".remove-cart-item")) { event.preventDefault(); openDetails(); } });
    });
}

async function checkoutCart() {
    const cart = getCart();
    if (!cart.length) return;
    checkoutButton.disabled = true;
    if (API_ENABLED) {
        const response = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clientId: session.id, clientName: session.name || "Cliente", items: cart.map(entry => ({ productId: entry.productId, variationId: entry.variationId || null, quantity: entry.quantity })) }) });
        if (!response.ok) { noteElement.textContent = "Não foi possível finalizar o pedido. Verifique o estoque."; checkoutButton.disabled = false; renderCart(); return; }
        const data = await response.json();
        catalogProducts = data.products || catalogProducts;
    } else {
        const products = readProducts();
        for (const item of cart) {
            const product = products.find(entry => String(entry.id) === String(item.productId));
            const variation = getVariation(product, item.variationId);
            const stock = variation ? Number(variation.quantity || 0) : Number(product?.quantity || 0);
            if (!product || stock < item.quantity) { noteElement.textContent = "Estoque insuficiente para finalizar o pedido."; checkoutButton.disabled = false; return; }
            if (variation) variation.quantity -= item.quantity;
            product.quantity -= item.quantity;
            product.salesCount = Number(product.salesCount || 0) + item.quantity;
        }
        saveProducts(products);
    }
    cart.forEach(item => savePurchase(item.productId));
    saveCart([]);
    noteElement.textContent = "Compra finalizada com sucesso.";
    cartPanel.hidden = true;
    renderCart();
    render();
}

function readMedia(file) {
    return new Promise(resolve => {
        if (!file) return resolve(null);
        const reader = new FileReader();
        reader.onload = () => resolve({ type: file.type, data: reader.result, name: file.name });
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
    });
}

async function submitRating(productId, value, file) {
    if (value < 1 || value > 5) return;
    const media = await readMedia(file);
    if (API_ENABLED) {
        fetch(`/api/products/${encodeURIComponent(productId)}/ratings`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clientId: session.id, value, media }) })
            .then(response => { if (!response.ok) throw new Error("Avaliacao indisponivel"); return response.json(); })
            .then(data => {
                catalogProducts = catalogProducts.map(product => product.id === data.product.id ? data.product : product);
                noteElement.textContent = "Avaliação registrada com sucesso.";
                render();
            })
            .catch(() => { noteElement.textContent = "Não foi possível registrar a avaliação agora."; });
        return;
    }
    const products = readProducts();
    const product = products.find(item => String(item.id) === String(productId));
    if (!product) return;
    product.ratings = Array.isArray(product.ratings) ? product.ratings : [];
    const existing = product.ratings.find(rating => String(rating.clientId) === String(session.id));
    if (existing) { existing.value = value; existing.media = media; }
    else product.ratings.push({ clientId: session.id, value, media, createdAt: Date.now() });
    saveProducts(products);
    noteElement.textContent = "Avaliação registrada com sucesso.";
    render();
}

function openProductDetails(productId) {
    const product = readProducts().find(item => String(item.id) === String(productId));
    if (!product) return;
    const ratings = Array.isArray(product.ratings) ? product.ratings : [];
    const reviews = ratings.length ? ratings.map(rating => `<article class="review"><p>${"★".repeat(Number(rating.value))}${"☆".repeat(5 - Number(rating.value))}</p>${rating.media?.type?.startsWith("video/") ? `<video class="review-media" controls src="${escapeHtml(rating.media.data)}"></video>` : rating.media?.data ? `<img class="review-media" src="${escapeHtml(rating.media.data)}" alt="Mídia da avaliação">` : ""}</article>`).join("") : `<p class="details-description">Este produto ainda não possui avaliações.</p>`;
    const purchased = getPurchases().includes(String(product.id));
    const delivered = API_ENABLED ? deliveredPurchases.has(String(product.id)) : purchased;
    const cartQuantity = getCartQuantity(product.id);
    const variations = getVariations(product);
    const selectedVariation = variations.find(variation => getCartQuantity(product.id, variation.id) < Number(variation.quantity || 0)) || variations[0];
    const canAdd = selectedVariation ? getCartQuantity(product.id, selectedVariation.id) < Number(selectedVariation.quantity || 0) : cartQuantity < Number(product.quantity || 0);
    const variationOptions = variations.length ? `<div class="variation-choice"><strong>Escolha uma opção</strong><div class="variation-buttons" role="group" aria-label="Opções de cor e tamanho">${variations.map(variation => `<button class="variation-button ${variation.id === selectedVariation?.id ? "selected" : ""}" type="button" data-variation-id="${escapeHtml(variation.id)}" ${Number(variation.quantity || 0) < 1 ? "disabled" : ""}><span>${escapeHtml(variation.color)}</span><small>Tamanho ${escapeHtml(variation.size)} · ${Number(variation.quantity || 0)} disponíveis</small></button>`).join("")}</div></div>` : "";
    const selectedStock = selectedVariation ? Number(selectedVariation.quantity || 0) : Number(product.quantity || 0);
    const selectedInCart = selectedVariation ? getCartQuantity(product.id, selectedVariation.id) : cartQuantity;
    const quantityOptions = `<div class="quantity-choice"><div><strong>Quantidade</strong><small id="quantityStock">${Math.max(0, selectedStock - selectedInCart)} disponíveis</small></div><div class="quantity-control"><button id="quantityDecrease" type="button" aria-label="Diminuir quantidade">−</button><output id="purchaseQuantity" for="quantityDecrease quantityIncrease">1</output><button id="quantityIncrease" type="button" aria-label="Aumentar quantidade">+</button></div></div>`;
    const wholesale = product.wholesale && Number(product.wholesale.minQuantity) >= 2 ? `<div class="wholesale-box">🏷️ Atacado: a partir de ${Number(product.wholesale.minQuantity)} peças por R$ ${Number(product.wholesale.price).toFixed(2).replace(".", ",")} cada.</div>` : "";
    productDetailsContent.innerHTML = `<h2 id="productDetailsTitle">${escapeHtml(product.name)}</h2><img class="details-product-image" src="${escapeHtml(product.image || PLACEHOLDER)}" alt="${escapeHtml(product.name)}" onerror="this.onerror=null;this.src='${PLACEHOLDER}'"><div class="details-meta"><span>${escapeHtml(product.category || "Produto")}</span><strong>R$ ${Number(product.price || 0).toFixed(2).replace(".", ",")}</strong><span>${Number(product.quantity || 0)} em estoque</span></div><p class="details-description">${escapeHtml(product.description || "O vendedor ainda não adicionou uma descrição.")}</p>${variationOptions}${quantityOptions}${wholesale}<button id="detailsAddToCart" class="buy-button" type="button" ${canAdd ? "" : "disabled"}>${cartQuantity ? `Adicionar mais (${cartQuantity} no carrinho)` : "Adicionar ao carrinho"}</button><a class="chat-button" href="chat_comerciante.html?merchant=${encodeURIComponent(product.ownerId)}">Conversar com a loja</a><h3 class="reviews-title">Avaliações (${ratings.length})</h3><div>${reviews}</div>${delivered ? `<div class="review-form"><strong>Deixe sua avaliação</strong><select id="detailsRating"><option value="">Escolha de 1 a 5 estrelas</option><option value="1">1 estrela</option><option value="2">2 estrelas</option><option value="3">3 estrelas</option><option value="4">4 estrelas</option><option value="5">5 estrelas</option></select><input id="detailsReviewMedia" type="file" accept="image/*,video/*"><button id="detailsRatingButton" class="rating-button" type="button">Enviar avaliação</button></div>` : purchased ? `<p class="review-waiting">A avaliação ficará disponível após a entrega.</p>` : ""}`;
    productDetailsModal.hidden = false;
    let selectedVariationId = selectedVariation?.id || null;
    let purchaseQuantity = 1;
    const updatePurchaseControls = () => {
        const currentVariation = getVariation(product, selectedVariationId);
        const available = Math.max(0, (currentVariation ? Number(currentVariation.quantity || 0) : Number(product.quantity || 0)) - getCartQuantity(product.id, selectedVariationId));
        purchaseQuantity = Math.min(Math.max(1, purchaseQuantity), Math.max(1, available));
        document.getElementById("purchaseQuantity").textContent = purchaseQuantity;
        document.getElementById("quantityStock").textContent = `${available} disponíveis`;
        document.getElementById("detailsAddToCart").disabled = available < 1;
    };
    productDetailsContent.querySelectorAll(".variation-button").forEach(button => button.addEventListener("click", () => {
        selectedVariationId = button.dataset.variationId;
        productDetailsContent.querySelectorAll(".variation-button").forEach(item => item.classList.toggle("selected", item === button));
        updatePurchaseControls();
    }));
    document.getElementById("quantityDecrease")?.addEventListener("click", () => { purchaseQuantity = Math.max(1, purchaseQuantity - 1); updatePurchaseControls(); });
    document.getElementById("quantityIncrease")?.addEventListener("click", () => { purchaseQuantity += 1; updatePurchaseControls(); });
    updatePurchaseControls();
    document.getElementById("detailsAddToCart")?.addEventListener("click", () => { productDetailsModal.hidden = true; buyProduct(product.id, selectedVariationId, purchaseQuantity); });
    document.getElementById("detailsRatingButton")?.addEventListener("click", () => submitRating(product.id, Number(document.getElementById("detailsRating").value), document.getElementById("detailsReviewMedia").files[0]));
}

searchElement.addEventListener("input", render);
cartButton.addEventListener("click", () => { renderCart(); cartPanel.hidden = false; });
document.getElementById("closeCart").addEventListener("click", () => { cartPanel.hidden = true; });
document.getElementById("continueShopping").addEventListener("click", () => { cartPanel.hidden = true; });
checkoutButton.addEventListener("click", checkoutCart);
document.getElementById("closeProductDetails").addEventListener("click", () => { productDetailsModal.hidden = true; });
productDetailsModal.addEventListener("click", event => { if (event.target === productDetailsModal) productDetailsModal.hidden = true; });
render();
renderCart();
loadCatalog();
if (API_ENABLED) window.setInterval(loadCatalog, 5000);
