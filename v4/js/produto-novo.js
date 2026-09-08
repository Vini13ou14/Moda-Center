// =========================================================
// CADASTRO DE PRODUTO (produto-novo.html)
// =========================================================
// Formulário de cadastro de produto do comerciante:
// - escolha do tipo de produto (categoria) em uma grade visual;
// - nome, preço e segmento (masculino/feminino/infantil/unissex);
// - foto opcional (convertida para uma imagem embutida, já que
//   não existe servidor para receber upload de arquivos);
// - ao salvar, o produto entra em "modaCenterProducts" e passa a
//   aparecer em "Seus produtos" na tela inicial do comerciante.
//
// A validação de login/comerciante já foi feita por
// js/comerciante-guard.js (carregado antes deste arquivo).
// =========================================================

const PRODUCTS_KEY = "modaCenterProducts";

const productForm = document.getElementById("productForm");
const categoryGrid = document.getElementById("categoryGrid");
const categoryInput = document.getElementById("categoryInput");
const categoryNote = document.getElementById("categoryNote");
const categoryToggle = document.getElementById("categoryToggle");
const categoryOptions = document.getElementById("categoryOptions");
const newCategoryInput = document.getElementById("newCategoryInput");
const addCategoryButton = document.getElementById("addCategoryButton");
const categoriesKey = "modaCenterCategories";
const merchantId = String(window.comercianteSession?.id || "");

function getCategories() {
	const saved = JSON.parse(localStorage.getItem(categoriesKey) || "{}");
	return saved[merchantId] || [];
}

function saveCategories(categories) {
	const saved = JSON.parse(localStorage.getItem(categoriesKey) || "{}");
	saved[merchantId] = categories;
	localStorage.setItem(categoriesKey, JSON.stringify(saved));
}

function renderCategories() {
	categoryOptions.innerHTML = getCategories().map(category => `<button type="button" class="category-chip" data-category="${category.replace(/"/g, "&quot;")}" role="option">${category}</button>`).join("");
	categoryOptions.querySelectorAll(".category-chip").forEach(chip => chip.addEventListener("click", () => {
		categoryInput.value = chip.dataset.category;
		categoryToggle.textContent = chip.dataset.category;
		categoryToggle.append(" ", "⌄");
		categoryGrid.hidden = true;
		categoryToggle.setAttribute("aria-expanded", "false");
	}));
}

renderCategories();
const imageInput = document.getElementById("imageInput");
const imagePreview = document.getElementById("imagePreview");
const formNote = document.getElementById("formNote");
const toast = document.getElementById("toast");
const wholesaleEnabled = document.getElementById("wholesaleEnabled");
const wholesaleFields = document.getElementById("wholesaleFields");
const quantityInput = productForm.elements.quantity;
const variationRows = document.getElementById("variationRows");
const addVariationButton = document.getElementById("addVariation");

function addVariationRow(container, variation = {}) {
	const row = document.createElement("div");
	row.className = "variation-row";
	row.innerHTML = `<label>Cor<input type="text" data-variation-color placeholder="Ex.: Azul" value="${String(variation.color || "").replace(/"/g, "&quot;")}"></label><label>Tamanho<input type="text" data-variation-size placeholder="Ex.: P" value="${String(variation.size || "").replace(/"/g, "&quot;")}"></label><label>Quantidade<input type="number" data-variation-quantity min="0" step="1" value="${Number(variation.quantity || 0)}"></label><button class="remove-variation" type="button" aria-label="Remover variação">&times;</button>`;
	container.appendChild(row);
	row.querySelector(".remove-variation").addEventListener("click", () => { row.remove(); updateVariationTotal(); });
	row.querySelectorAll("input").forEach(input => input.addEventListener("input", updateVariationTotal));
}

function readVariations(container) {
	return [...container.querySelectorAll(".variation-row")].map(row => ({
		id: row.dataset.variationId || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
		color: row.querySelector("[data-variation-color]").value.trim(),
		size: row.querySelector("[data-variation-size]").value.trim(),
		quantity: Math.max(0, Number(row.querySelector("[data-variation-quantity]").value || 0))
	}));
}

function updateVariationTotal() {
	const rows = variationRows.querySelectorAll(".variation-row");
	if (rows.length) quantityInput.value = [...rows].reduce((total, row) => total + Math.max(0, Number(row.querySelector("[data-variation-quantity]").value || 0)), 0);
}

addVariationButton.addEventListener("click", () => addVariationRow(variationRows));

// Mostra uma mensagem curta no rodapé da tela por ~2,2s.
function showToast(message) {
	if (!toast) return;

	toast.textContent = message;
	toast.classList.add("show");

	clearTimeout(window.toastTimer);
	window.toastTimer = setTimeout(() => {
		toast.classList.remove("show");
	}, 2200);
}

// =========================================================
// SELEÇÃO DE CATEGORIA (TIPO DE PRODUTO)
// =========================================================
// Só um card fica selecionado por vez. O valor escolhido vai
// para o campo escondido #categoryInput, que é o que realmente
// entra no FormData ao enviar o formulário.
addCategoryButton.addEventListener("click", () => {
	const category = newCategoryInput.value.trim();
	if (!category) return;
	const categories = getCategories();
	if (!categories.some(item => item.toLowerCase() === category.toLowerCase())) saveCategories([...categories, category]);
	newCategoryInput.value = "";
	renderCategories();
});

categoryToggle.addEventListener("click", () => {
	categoryGrid.hidden = !categoryGrid.hidden;
	categoryToggle.setAttribute("aria-expanded", String(!categoryGrid.hidden));
});
document.addEventListener("click", event => {
	if (!event.target.closest(".category-picker")) {
		categoryGrid.hidden = true;
		categoryToggle.setAttribute("aria-expanded", "false");
	}
});

// =========================================================
// PRÉ-VISUALIZAÇÃO DA FOTO
// =========================================================
// Lê o arquivo escolhido e converte para uma imagem embutida
// (data URL), para poder mostrar o preview e também guardar o
// produto com a foto — tudo isso sem precisar de um servidor.
imageInput.addEventListener("change", () => {
	const file = imageInput.files[0];

	if (!file) {
		imagePreview.hidden = true;
		return;
	}

	const reader = new FileReader();

	reader.onload = () => {
		imagePreview.src = reader.result;
		imagePreview.hidden = false;
	};

	reader.readAsDataURL(file);
});

wholesaleEnabled?.addEventListener("change", () => { wholesaleFields.hidden = !wholesaleEnabled.checked; });

// =========================================================
// ENVIO DO FORMULÁRIO
// =========================================================
productForm.addEventListener("submit", event => {
	void saveProduct(event);
	return;
});

async function saveProduct(event) {
	event.preventDefault();

	const data = new FormData(productForm);
	const name = String(data.get("name") || "").trim();
	const price = Number(data.get("price"));
	const category = String(data.get("category") || "");
	const segments = data.getAll("segment");
	const variations = readVariations(variationRows);

	// Validações simples, com o mesmo padrão de aviso já usado no
	// resto do site (mensagem curta perto do campo em vez de um
	// alert()).
	if (!category) {
		categoryNote.textContent = "Escolha o tipo de produto.";
		categoryGrid.scrollIntoView({ behavior: "smooth", block: "center" });
		return;
	}

	if (!name || !price || price <= 0) {
		formNote.textContent = "Preencha o nome e um preço válido para o produto.";
		return;
	}

	if (variations.some(variation => !variation.color || !variation.size)) {
		formNote.textContent = "Preencha a cor e o tamanho de todas as variações.";
		return;
	}
	if (variations.some((variation, index) => variations.some((other, otherIndex) => index !== otherIndex && variation.color.toLowerCase() === other.color.toLowerCase() && variation.size.toLowerCase() === other.size.toLowerCase()))) {
		formNote.textContent = "Não repita a mesma combinação de cor e tamanho.";
		return;
	}

	// Salva o produto na lista deste comerciante (uma lista por
	// usuário, indexada pelo id da sessão — igual ao padrão já
	// usado em "modaCenterStores").
	const product = {
		id: Date.now(),
		ownerId: window.comercianteSession.id,
		name: name,
		description: String(data.get("description") || "").trim(),
		price: price,
		quantity: Number(data.get("quantity") || 0),
		variations,
		category: category,
		segments: segments,
		image: imagePreview.hidden ? null : imagePreview.src,
		createdAt: Date.now(),
		wholesale: wholesaleEnabled?.checked ? { minQuantity: Number(data.get("wholesaleMinQuantity") || 3), price: Number(data.get("wholesalePrice") || 0) } : null
	};

	if (window.location.protocol !== "file:") {
		try {
			const response = await fetch("/api/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(product) });
			if (!response.ok) throw new Error("Servidor indisponível");
		} catch (error) {
			formNote.textContent = "Não foi possível salvar no servidor. Tente novamente.";
			return;
		}
	}

	const allProducts = JSON.parse(localStorage.getItem(PRODUCTS_KEY) || "{}");
	const myProducts = allProducts[window.comercianteSession.id] || [];
	myProducts.push(product);

	allProducts[window.comercianteSession.id] = myProducts;
	localStorage.setItem(PRODUCTS_KEY, JSON.stringify(allProducts));

	showToast("Produto cadastrado com sucesso!");

	// Pequena pausa para o toast aparecer antes de sair da página.
	setTimeout(() => {
		window.location.href = "inicio_comerciante.html";
	}, 900);
}
