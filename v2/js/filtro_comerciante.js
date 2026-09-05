const PRODUCTS_KEY = "modaCenterProducts";
const session = window.comercianteSession;
const productsList = document.getElementById("productsList");
const productSearch = document.getElementById("productSearch");
const productCount = document.getElementById("productCount");
const clearFilters = document.getElementById("clearFilters");
const segmentButtons = document.querySelectorAll(".segment-filter");
const editModal = document.getElementById("editModal");
const editForm = document.getElementById("editForm");
const editProductId = document.getElementById("editProductId");
const editPrice = document.getElementById("editPrice");
const editDiscount = document.getElementById("editDiscount");
const editQuantity = document.getElementById("editQuantity");
const editImage = document.getElementById("editImage");
const editImagePreview = document.getElementById("editImagePreview");
const editFinalPrice = document.getElementById("editFinalPrice");
const editNote = document.getElementById("editNote");
const detailsModal = document.getElementById("detailsModal");
const detailsContent = document.getElementById("detailsContent");
let selectedSegment = "";
let pendingImage = "";

const segmentLabels = {
    masculino: "Masculino",
    feminino: "Feminino",
    infantil: "Infantil",
    unissex: "Unissex"
};

function escapeHtml(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function getSegments(product) {
    const segments = Array.isArray(product.segments)
        ? product.segments
        : [product.segments].filter(Boolean);

    return segments.map(segment => String(segment).toLowerCase());
}

function getProducts() {
    try {
        const allProducts = JSON.parse(localStorage.getItem(PRODUCTS_KEY) || "{}");
        return Array.isArray(allProducts[session.id]) ? allProducts[session.id] : [];
    } catch (error) {
        return [];
    }
}

function saveProducts(products) {
    const allProducts = JSON.parse(localStorage.getItem(PRODUCTS_KEY) || "{}");
    allProducts[session.id] = products;
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(allProducts));
}

function getFinalPrice(price, discount) {
    return price * (1 - discount / 100);
}

function productCard(product) {
    const segments = getSegments(product);
    const price = Number(product.price || 0);
    const discount = Number(product.discount || 0);
    const finalPrice = getFinalPrice(price, discount);
    const segmentMarkup = segments
        .map(segment => `<span>${escapeHtml(segmentLabels[segment] || segment)}</span>`)
        .join("");

    return `
        <article class="product-card" data-id="${escapeHtml(product.id)}" data-segments="${escapeHtml(segments.join(" "))}">
            <button class="product-options" type="button" aria-label="Opções do produto">⋮</button>
            <div class="product-image">
                <img src="${escapeHtml(product.image || "assets/images/moda.png")}" alt="${escapeHtml(product.name)}">
                    <img src="${escapeHtml(product.image || "assets/images/moda.png")}" alt="${escapeHtml(product.name)}" onerror="this.onerror=null;this.src='assets/images/moda.png'">
            </div>
            <div class="product-info">
                <h3>${escapeHtml(product.name)}</h3>
                <p class="product-category">${escapeHtml(product.category || "Produto")}</p>
                ${discount > 0 ? `<p class="product-old-price">R$ ${price.toFixed(2).replace(".", ",")}</p>` : ""}
                <p class="product-price">R$ ${finalPrice.toFixed(2).replace(".", ",")}</p>
                <p class="product-stock">${Number(product.quantity || 0)} em estoque${discount > 0 ? ` · ${discount}% OFF` : ""}</p>
                <div class="product-segments">${segmentMarkup}</div>
                <button class="view-product-button" type="button">Ver produto</button>
            </div>
        </article>
    `;
}

function renderProducts() {
    const products = getProducts().slice().reverse();

    if (!products.length) {
        productsList.innerHTML = `
            <div class="products-empty">
                <p>Você ainda não cadastrou nenhum produto.</p>
                <a class="primary-button" href="produto-novo.html">Cadastrar primeiro produto</a>
            </div>
        `;
        productCount.textContent = "0 produtos";
        return;
    }

    productsList.innerHTML = products.map(productCard).join("");
    productsList.querySelectorAll(".product-card").forEach(card => {
        card.querySelector(".product-options").addEventListener("click", event => {
            event.stopPropagation();
            openEditModal(card.dataset.id);
        });
        card.querySelector(".view-product-button").addEventListener("click", event => {
            event.stopPropagation();
            openDetailsModal(card.dataset.id);
        });
    });
    updateVisibleProducts();
}

function updateVisibleProducts() {
    const query = productSearch.value.trim().toLowerCase();
    let visibleCount = 0;

    document.querySelectorAll(".product-card").forEach(card => {
        const segments = card.dataset.segments.split(" ");
        const matchesSegment = !selectedSegment || segments.includes(selectedSegment);
        const matchesSearch = !query || card.textContent.toLowerCase().includes(query);
        const visible = matchesSegment && matchesSearch;

        card.classList.toggle("is-hidden", !visible);
        if (visible) visibleCount += 1;
    });

    productCount.textContent = `${visibleCount} ${visibleCount === 1 ? "produto" : "produtos"}`;
    clearFilters.hidden = !selectedSegment && !query;
}

function formatCurrency(value) {
    return `R$ ${Number(value || 0).toFixed(2).replace(".", ",")}`;
}

function updateFinalPrice() {
    const price = Number(editPrice.value || 0);
    const discount = Math.min(100, Math.max(0, Number(editDiscount.value || 0)));
    editFinalPrice.textContent = `Preço final: ${formatCurrency(getFinalPrice(price, discount))}`;
}

function openEditModal(productId) {
    const product = getProducts().find(item => String(item.id) === String(productId));
    if (!product) return;

    editProductId.value = product.id;
    editPrice.value = Number(product.price || 0);
    editDiscount.value = Number(product.discount || 0);
    editQuantity.value = Number(product.quantity || 0);
    pendingImage = product.image || "";
    editImage.value = "";
    editNote.textContent = "";

    if (pendingImage) {
        editImagePreview.src = pendingImage;
        editImagePreview.hidden = false;
    } else {
        editImagePreview.hidden = true;
    }

    updateFinalPrice();
    editModal.hidden = false;
    editPrice.focus();
}

function closeEditModal() {
    editModal.hidden = true;
}

function openDetailsModal(productId) {
    const product = getProducts().find(item => String(item.id) === String(productId));
    if (!product) return;

    const price = Number(product.price || 0);
    const discount = Number(product.discount || 0);
    const finalPrice = getFinalPrice(price, discount);
    const segments = getSegments(product)
        .map(segment => escapeHtml(segmentLabels[segment] || segment))
        .join(", ") || "Não informado";

    detailsContent.innerHTML = `
        <p class="eyebrow details-eyebrow">DETALHES DO PRODUTO</p>
        <h2 id="detailsTitle">${escapeHtml(product.name)}</h2>
        <img class="details-image" src="${escapeHtml(product.image || "assets/images/moda.png")}" alt="${escapeHtml(product.name)}">
            <img class="details-image" src="${escapeHtml(product.image || "assets/images/moda.png")}" alt="${escapeHtml(product.name)}" onerror="this.onerror=null;this.src='assets/images/moda.png'">
        <dl class="details-list">
            <div><dt>Categoria</dt><dd>${escapeHtml(product.category || "Não informada")}</dd></div>
            <div><dt>Segmento</dt><dd>${segments}</dd></div>
            <div><dt>Preço original</dt><dd>${formatCurrency(price)}</dd></div>
            <div><dt>Desconto</dt><dd>${discount}%</dd></div>
            <div><dt>Preço final</dt><dd class="details-highlight">${formatCurrency(finalPrice)}</dd></div>
            <div><dt>Quantidade disponível</dt><dd>${Number(product.quantity || 0)} unidade(s)</dd></div>
        </dl>
    `;
    detailsModal.hidden = false;
}

function closeDetailsModal() {
    detailsModal.hidden = true;
}

segmentButtons.forEach(button => {
    button.addEventListener("click", () => {
        selectedSegment = button.dataset.segment;
        segmentButtons.forEach(item => item.classList.toggle("active", item === button));
        updateVisibleProducts();
    });
});

productSearch.addEventListener("input", updateVisibleProducts);

editPrice.addEventListener("input", updateFinalPrice);
editDiscount.addEventListener("input", updateFinalPrice);

editImage.addEventListener("change", () => {
    const file = editImage.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
        pendingImage = reader.result;
        editImagePreview.src = pendingImage;
        editImagePreview.hidden = false;
    };
    reader.readAsDataURL(file);
});

editForm.addEventListener("submit", event => {
    event.preventDefault();

    const price = Number(editPrice.value);
    const discount = Number(editDiscount.value || 0);
    const quantity = Number(editQuantity.value);

    if (!price || price <= 0 || discount < 0 || discount > 100 || quantity < 0) {
        editNote.textContent = "Confira o preço, o desconto e a quantidade informados.";
        return;
    }

    const products = getProducts();
    const product = products.find(item => String(item.id) === String(editProductId.value));
    if (!product) return;

    product.price = price;
    product.discount = discount;
    product.quantity = quantity;
    product.image = pendingImage || null;
    saveProducts(products);
    closeEditModal();
    renderProducts();
});

document.getElementById("closeEdit").addEventListener("click", closeEditModal);
editModal.addEventListener("click", event => {
    if (event.target === editModal) closeEditModal();
});
document.getElementById("closeDetails").addEventListener("click", closeDetailsModal);
detailsModal.addEventListener("click", event => {
    if (event.target === detailsModal) closeDetailsModal();
});

clearFilters.addEventListener("click", () => {
    selectedSegment = "";
    productSearch.value = "";
    segmentButtons.forEach(button => button.classList.toggle("active", !button.dataset.segment));
    updateVisibleProducts();
});

document.querySelectorAll(".bottom-navigation .nav-item").forEach(item => {
    item.addEventListener("click", () => {
        window.location.href = item.dataset.page;
    });
});

document.getElementById("addProduct").addEventListener("click", () => {
    window.location.href = "produto-novo.html";
});

renderProducts();

const requestedProduct = new URLSearchParams(window.location.search);
if (requestedProduct.get("edit")) {
    openEditModal(requestedProduct.get("edit"));
} else if (requestedProduct.get("view")) {
    openDetailsModal(requestedProduct.get("view"));
}
