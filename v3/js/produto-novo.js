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
const imageInput = document.getElementById("imageInput");
const imagePreview = document.getElementById("imagePreview");
const formNote = document.getElementById("formNote");
const toast = document.getElementById("toast");

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
categoryGrid.querySelectorAll(".category-chip").forEach(chip => {
	chip.addEventListener("click", () => {
		categoryGrid.querySelectorAll(".category-chip").forEach(item => item.classList.remove("selected"));
		chip.classList.add("selected");
		categoryInput.value = chip.dataset.category;
		categoryNote.textContent = "";
	});
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

// =========================================================
// ENVIO DO FORMULÁRIO
// =========================================================
productForm.addEventListener("submit", event => {
	event.preventDefault();

	const data = new FormData(productForm);
	const name = String(data.get("name") || "").trim();
	const price = Number(data.get("price"));
	const category = String(data.get("category") || "");
	const segments = data.getAll("segment");

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

	// Salva o produto na lista deste comerciante (uma lista por
	// usuário, indexada pelo id da sessão — igual ao padrão já
	// usado em "modaCenterStores").
	const allProducts = JSON.parse(localStorage.getItem(PRODUCTS_KEY) || "{}");
	const myProducts = allProducts[window.comercianteSession.id] || [];

	myProducts.push({
		id: Date.now(),
		name: name,
		price: price,
		category: category,
		segments: segments,
		image: imagePreview.hidden ? null : imagePreview.src,
		createdAt: Date.now()
	});

	allProducts[window.comercianteSession.id] = myProducts;
	localStorage.setItem(PRODUCTS_KEY, JSON.stringify(allProducts));

	showToast("Produto cadastrado com sucesso!");

	// Pequena pausa para o toast aparecer antes de sair da página.
	setTimeout(() => {
		window.location.href = "inicio_comerciante.html";
	}, 900);
});
