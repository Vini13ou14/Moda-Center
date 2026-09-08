// =========================================================
// CONFIGURAÇÃO DA LOJA (cadastro-loja.html)
// =========================================================
// Formulário de primeiro acesso do comerciante: nome da loja e
// segmento(s) de roupa. É exibido só uma vez — depois de salvo,
// os dados ficam em "modaCenterStores" (ver js/main.js) e o
// login passa a ir direto para inicio_comerciante.html.
//
// A validação de login/comerciante já foi feita por
// js/comerciante-guard.js (carregado antes deste arquivo).
// =========================================================

const STORES_KEY = "modaCenterStores";

// Se este comerciante já configurou a loja antes (ex.: ele voltou
// nesta página digitando a URL de novo), não faz sentido pedir
// os dados de novo — manda direto para a tela inicial.
const existingStores = JSON.parse(localStorage.getItem(STORES_KEY) || "{}");

if (existingStores[window.comercianteSession.id]) {
	window.location.href = "inicio_comerciante.html";
}

if (window.location.protocol !== "file:") {
	fetch(`/api/stores/${encodeURIComponent(window.comercianteSession.id)}`, { cache: "no-store" }).then(response => response.json()).then(data => {
		if (!data.store) return;
		const stores = JSON.parse(localStorage.getItem(STORES_KEY) || "{}");
		stores[window.comercianteSession.id] = data.store;
		localStorage.setItem(STORES_KEY, JSON.stringify(stores));
		window.location.href = "inicio_comerciante.html";
	}).catch(() => {});
}

// =========================================================
// ENVIO DO FORMULÁRIO
// =========================================================

const storeForm = document.getElementById("storeForm");
const storeNote = document.getElementById("storeNote");
const storeImageInput = document.getElementById("storeImage");

storeForm.addEventListener("submit", event => {
	event.preventDefault();

	const data = new FormData(storeForm);
	const storeName = String(data.get("storeName") || "").trim();
	const segments = String(data.get("segment") || "").split(",").map(segment => segment.trim()).filter(Boolean);

	// Validação simples: nome preenchido e pelo menos um segmento marcado.
	if (!storeName) {
		storeNote.textContent = "Informe o nome da sua loja.";
		return;
	}

	if (segments.length === 0) {
		storeNote.textContent = "Selecione pelo menos um segmento.";
		return;
	}

	// Salva a loja deste comerciante (indexada pelo id da sessão).
	const stores = JSON.parse(localStorage.getItem(STORES_KEY) || "{}");

	const saveStore = async image => {
		const store = {
			name: storeName,
			segments: segments,
			image: image || null,
			createdAt: Date.now()
		};
		stores[window.comercianteSession.id] = {
			...store
		};

		localStorage.setItem(STORES_KEY, JSON.stringify(stores));
		if (window.location.protocol !== "file:") {
			try {
				const response = await fetch(`/api/stores/${encodeURIComponent(window.comercianteSession.id)}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...store, ownerId: window.comercianteSession.id }) });
				if (!response.ok) throw new Error("Loja nao salva");
			} catch (error) {
				storeNote.textContent = "Não foi possível salvar a loja no servidor.";
				return;
			}
		}
		window.location.href = "inicio_comerciante.html";
	};

	const file = storeImageInput?.files[0];
	if (!file) {
		saveStore(null);
		return;
	}

	const reader = new FileReader();
	reader.onload = () => saveStore(reader.result);
	reader.readAsDataURL(file);
});
