// =========================================================
// TELA INICIAL DO COMERCIANTE (inicio_comerciante.html)
// =========================================================
// Este script cuida da tela principal exibida depois do login:
// - mostra o nome do usuário logado;
// - controla a busca simples por texto nos cards da página;
// - controla o menu inferior (Início / Chat / Marketing / Perfil);
// - renderiza a seção "Seus produtos" com os produtos que o
//   próprio comerciante cadastrou (ver produto-novo.html);
// - dá um pequeno feedback visual (animação) em botões.
//
// Observação importante: este projeto ainda não tem um backend.
// Tudo (sessão do usuário, produtos, etc.) é lido do localStorage,
// que é só um armazenamento local do navegador — não é seguro
// nem sincroniza entre dispositivos. Serve bem para protótipo.
// =========================================================

// A sessão já foi lida e validada por js/comerciante-guard.js (carregado
// antes deste arquivo no HTML), então só reaproveitamos o resultado
// em vez de ler o localStorage de novo.
const session = window.comercianteSession;

// --- Referências aos elementos usados na página ---
const userName = document.getElementById("userName");
const searchInput = document.querySelector(".search-input");
const productsList = document.getElementById("productsList");
const storesList = document.getElementById("storesList");
const storeModal = document.getElementById("storeModal");
const storeModalContent = document.getElementById("storeModalContent");

// Padroniza a apresentação do nome sem alterar o valor salvo pelo usuário.
// Ex.: "joão" -> "João" (só a primeira letra maiúscula).
function formatDisplayName(name) {
	const value = String(name || "").trim();

	return value
		? value.charAt(0).toUpperCase() + value.slice(1)
		: value;
}

function escapeHtml(value) {
	return String(value || "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}

// Exibe o nome da sessão na saudação do cabeçalho.
if (session && userName) {
	// O login de teste (admin/123456) usa "admin" como e-mail;
	// aqui trocamos por um nome de exibição mais amigável.
	const displayName = session.email === "admin" ? "Teste" : session.name;

	userName.textContent = formatDisplayName(displayName);
}

// =========================================================
// "SEUS PRODUTOS"
// =========================================================
// Antes, esta seção mostrava 4 produtos de demonstração fixos no
// HTML (Blazer Slim Fit, Blusa Gola Alta, etc.). Agora ela é
// preenchida dinamicamente com os produtos que o próprio comerciante
// cadastrou em produto-novo.html — os produtos de demonstração
// somem assim que o comerciante tem produtos reais para mostrar.
if (productsList) {
	const allProducts = JSON.parse(localStorage.getItem("modaCenterProducts") || "{}");
	const myProducts = allProducts[session.id] || [];

	if (myProducts.length === 0) {

		// Nenhum produto cadastrado ainda: mostra um convite para
		// cadastrar o primeiro, em vez de uma lista vazia sem explicação.
		productsList.innerHTML = `
			<div class="products-empty">
				<p>Você ainda não cadastrou nenhum produto.</p>
				<a class="primary-button" href="produto-novo.html">Cadastrar meu primeiro produto</a>
			</div>
		`;

	} else {

		// Mostra os produtos mais recentes primeiro.
		productsList.innerHTML = myProducts
			.slice()
			.reverse()
			.map(product => {
				const price = Number(product.price || 0);
				const discount = Math.min(100, Math.max(0, Number(product.discount || 0)));
				const finalPrice = price * (1 - discount / 100);

				return `
				<article class="product-card" data-id="${escapeHtml(product.id)}" data-segments="${(Array.isArray(product.segments) ? product.segments : [product.segments].filter(Boolean)).join(" ").toLowerCase()}">
					<button class="product-options" aria-label="Opções do produto">⋮</button>
					<div class="product-image">
						<img src="${escapeHtml(product.image || 'assets/images/moda.png')}" alt="${escapeHtml(product.name)}" onerror="this.onerror=null;this.src='assets/images/moda.png'">
					</div>
					<div class="product-info">
						<h3>${product.name}</h3>
						${discount > 0 ? `<p class="product-old-price">R$ ${price.toFixed(2).replace(".", ",")}</p>` : ""}
						<p class="product-price">R$ ${finalPrice.toFixed(2).replace(".", ",")}</p>
						<p class="product-stock">${Number(product.quantity || 0)} em estoque${discount > 0 ? ` · ${discount}% OFF` : ""}</p>
						<span class="delivery">🚚 Entrega segura</span>
						<button class="favorite-button" type="button">♡ Ver produto</button>
					</div>
				</article>
				`;
			})
			.join("");

		productsList.querySelectorAll(".product-card").forEach(card => {
			card.querySelector(".product-options")?.addEventListener("click", event => {
				event.stopPropagation();
				window.location.href = `filtro_comerciante.html?edit=${encodeURIComponent(card.dataset.id)}`;
			});
			card.querySelector(".favorite-button")?.addEventListener("click", event => {
				event.stopPropagation();
				window.location.href = `filtro_comerciante.html?view=${encodeURIComponent(card.dataset.id)}`;
			});
		});

	}
}

// =========================================================
// LOJAS EM DESTAQUE
// =========================================================
// Cada loja configurada no primeiro acesso fica salva em
// "modaCenterStores", indexada pelo id do comerciante. A seção
// usa esses registros para nunca depender de lojas demonstrativas.
if (storesList) {
	const storeImages = ["assets/images/logo.png", "assets/images/moda.png", "assets/images/banner.png", "assets/images/aerial.jpg"];
	let stores = {};

	try {
		stores = JSON.parse(localStorage.getItem("modaCenterStores") || "{}");
	} catch (error) {
		stores = {};
	}

	const registeredStores = Object.entries(stores)
		.filter(([, store]) => store && store.name)
		.map(([ownerId, store], index) => {
			const segments = Array.isArray(store.segments) ? store.segments : [store.segments].filter(Boolean);
			const segmentLabel = segments.length
				? segments.map(segment => String(segment).charAt(0).toUpperCase() + String(segment).slice(1)).join(" / ")
				: "Moda e acessórios";

			return `
				<article class="store-card" data-store-owner="${escapeHtml(ownerId)}">
					<div class="store-logo">
						<img src="${escapeHtml(store.image || storeImages[index % storeImages.length])}" alt="${escapeHtml(store.name)}" onerror="this.onerror=null;this.src='assets/images/moda.png'">
					</div>
					<h3>${escapeHtml(store.name)}</h3>
					<span>${escapeHtml(segmentLabel)}</span>
					<button type="button" data-store-owner="${escapeHtml(ownerId)}">Ver loja</button>
				</article>
			`;
		})
		.join("");

	storesList.innerHTML = registeredStores || `
		<div class="stores-empty">
			<p>Ainda não existem lojas cadastradas.</p>
		</div>
	`;

	storesList.querySelectorAll(".store-card button[data-store-owner]").forEach(button => {
		button.addEventListener("click", () => openStoreModal(button.dataset.storeOwner));
	});
}

function openStoreModal(ownerId) {
	let stores = {};
	let allProducts = {};

	try {
		stores = JSON.parse(localStorage.getItem("modaCenterStores") || "{}");
		allProducts = JSON.parse(localStorage.getItem("modaCenterProducts") || "{}");
	} catch (error) {
		return;
	}

	const store = stores[ownerId];
	if (!store) return;

	const segments = Array.isArray(store.segments) ? store.segments : [store.segments].filter(Boolean);
	const products = Array.isArray(allProducts[ownerId]) ? allProducts[ownerId] : [];
	const productsMarkup = products.length
		? products.map(product => {
			const price = Number(product.price || 0);
			const discount = Number(product.discount || 0);
			const finalPrice = price * (1 - discount / 100);
			return `
				<article class="store-product">
					<img src="${escapeHtml(product.image || "assets/images/moda.png")}" alt="${escapeHtml(product.name)}">
					<div><strong>${escapeHtml(product.name)}</strong><span>R$ ${finalPrice.toFixed(2).replace(".", ",")}${discount > 0 ? ` · ${discount}% OFF` : ""}</span></div>
				</article>
			`;
		}).join("")
		: `<p class="store-empty-products">Esta loja ainda não possui produtos cadastrados.</p>`;

	storeModalContent.innerHTML = `
		<p class="store-modal-eyebrow">LOJA CADASTRADA</p>
		<h2 id="storeModalTitle">${escapeHtml(store.name)}</h2>
		<p class="store-modal-segments">${escapeHtml(segments.join(" / ") || "Moda e acessórios")}</p>
		<div class="store-products-heading"><strong>Produtos da loja</strong><span>${products.length} ${products.length === 1 ? "item" : "itens"}</span></div>
		<div class="store-products">${productsMarkup}</div>
	`;
	storeModal.hidden = false;
}

function closeStoreModal() {
	storeModal.hidden = true;
}

// =========================================================
// BUSCA
// =========================================================
// Filtra, no lado do cliente, todos os cards visíveis na página
// (catálogos, produtos, destaques e lojas) comparando o texto
// digitado com o conteúdo de texto de cada card.
if (searchInput) {
	searchInput.addEventListener("input", () => {
		const query = searchInput.value.trim().toLowerCase();

		document.querySelectorAll(".product-card, .highlight-card, .store-card").forEach(card => {
			card.classList.toggle("is-hidden", query && !card.textContent.toLowerCase().includes(query));
		});
	});
}

// =========================================================
// MENU INFERIOR (Início / Chat / Marketing / Perfil)
// =========================================================
// Todos os itens levam a uma página independente — não há mais
// nenhuma seção mostrada/escondida dentro desta mesma página.
document.querySelectorAll(".bottom-navigation .nav-item").forEach(item => {
	item.addEventListener("click", () => {
		const page = item.dataset.page;
		if (page) window.location.href = page;
	});
});

// =========================================================
// BOTÃO FLUTUANTE (+)
// =========================================================
// Atalho rápido para cadastrar um novo produto, disponível em
// qualquer ponto da tela inicial.
document.querySelector(".floating-button")?.addEventListener("click", () => {
	window.location.href = "produto-novo.html";
});

// =========================================================
// "VER TODOS" / "VER MENOS" DE CADA SEÇÃO
// =========================================================
// Cada seção (produtos, destaques, lojas) alterna
// entre mostrar uma lista compacta e mostrar todos os cards.
document.querySelectorAll(".see-all").forEach(button => {
	const list = button.closest(".section")?.querySelector(".products-list, .highlights-list, .stores-list");

	if (!list) return;

	button.addEventListener("click", () => {
		const expanded = list.classList.toggle("show-all");
		button.childNodes[0].textContent = expanded ? "Ver menos " : "Ver todos ";
		button.setAttribute("aria-expanded", String(expanded));
	});
});

document.getElementById("closeStoreModal")?.addEventListener("click", closeStoreModal);
storeModal?.addEventListener("click", event => {
	if (event.target === storeModal) closeStoreModal();
});

// =========================================================
// FEEDBACK VISUAL DOS BOTÕES
// =========================================================
// Pequena animação de "clique" (encolhe e volta ao tamanho normal)
// em botões que ainda não têm uma ação real implementada, só para
// dar a sensação de resposta ao toque.
document.querySelectorAll(".see-all, .highlight-overlay button, .store-card button, .favorite-button").forEach(button => {
	button.addEventListener("click", () => {
		button.animate([
			{ transform: "scale(1)" },
			{ transform: "scale(.96)" },
			{ transform: "scale(1)" }
		], { duration: 180 });
	});
});
