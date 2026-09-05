// =========================================================
// TELA INICIAL DO VENDEDOR (inicio_vendedor.html)
// =========================================================
// Este script cuida da tela principal exibida depois do login:
// - mostra o nome do usuário logado;
// - controla a busca simples por texto nos cards da página;
// - controla o menu inferior (Início / Chat / Marketing / Perfil);
// - controla o painel de "Configurações" (modal);
// - dá um pequeno feedback visual (animação) em botões.
//
// Observação importante: este projeto ainda não tem um backend.
// Tudo (sessão do usuário, chats, etc.) é lido do localStorage,
// que é só um armazenamento local do navegador — não é seguro
// nem sincroniza entre dispositivos. Serve bem para protótipo.
// =========================================================

// Recupera a sessão criada pelo login (main.js) para personalizar a tela.
const session = JSON.parse(localStorage.getItem("modaCenterSession") || "null");

// --- Referências aos elementos usados na página ---
const userName = document.getElementById("userName");
const searchInput = document.querySelector(".search-input");
const profileMenu = document.getElementById("profileMenu");
const profileButton = document.querySelector('.bottom-navigation [data-page="perfil"]');
const profileName = document.getElementById("profileName");
const profileLogout = document.querySelector(".profile-logout");
const profileView = document.getElementById("profileView");
const profileViewName = document.getElementById("profileViewName");
const profileInitials = document.getElementById("profileInitials");
const header = document.querySelector(".header");
const content = document.querySelector(".content");
const floatingButton = document.querySelector(".floating-button");
const settingsButton = document.getElementById("profileSettingsButton");
const settingsBackdrop = document.getElementById("settingsBackdrop");
const settingsClose = document.getElementById("settingsClose");
const settingsLogout = document.getElementById("settingsLogout");
const settingsName = document.getElementById("settingsName");
const settingsInitials = document.getElementById("settingsInitials");
const toast = document.getElementById("toast");

// Padroniza a apresentação do nome sem alterar o valor salvo pelo usuário.
// Ex.: "joão" -> "João" (só a primeira letra maiúscula).
function formatDisplayName(name) {
	const value = String(name || "").trim();

	return value
		? value.charAt(0).toUpperCase() + value.slice(1)
		: value;
}

// Mostra uma mensagem curta no rodapé da tela por ~2,2s.
// Não está sendo chamada em nenhum lugar desta página no momento
// (o único aviso que existia aqui, o de "Marketing em
// desenvolvimento", não é mais necessário agora que a Central de
// Marketing tem página própria) — mantida disponível para o
// próximo aviso que precisar aparecer aqui.
function showToast(message) {
	if (!toast) return;

	toast.textContent = message;
	toast.classList.add("show");

	clearTimeout(window.toastTimer);
	window.toastTimer = setTimeout(() => {
		toast.classList.remove("show");
	}, 2200);
}

// Exibe o nome da sessão na saudação e no menu de perfil.
if (session && userName) {
	// O login de teste (admin/123456) usa "admin" como e-mail;
	// aqui trocamos por um nome de exibição mais amigável.
	const displayName = session.email === "admin" ? "Teste" : session.name;

	userName.textContent = formatDisplayName(displayName);
	if (profileName) profileName.textContent = formatDisplayName(displayName);
	if (profileViewName) profileViewName.textContent = formatDisplayName(displayName);
	if (profileInitials) {
		// Gera as iniciais do nome (até 2 letras) para o avatar circular.
		const initials = formatDisplayName(displayName)
			.split(" ")
			.map(part => part.charAt(0))
			.slice(0, 2)
			.join("")
			.toUpperCase();
		profileInitials.textContent = initials;
		if (settingsInitials) settingsInitials.textContent = initials;
	}
	if (settingsName) settingsName.textContent = formatDisplayName(displayName);
}

// =========================================================
// PAINEL DE CONFIGURAÇÕES (modal "Minha conta")
// =========================================================

function setSettingsOpen(isOpen) {
	if (!settingsBackdrop) return;
	settingsBackdrop.classList.toggle("open", isOpen);
	settingsBackdrop.setAttribute("aria-hidden", String(!isOpen));
}

settingsButton?.addEventListener("click", () => setSettingsOpen(true));
settingsClose?.addEventListener("click", () => setSettingsOpen(false));
settingsBackdrop?.addEventListener("click", event => {
	// Fecha o modal só quando o clique foi no fundo escurecido,
	// não quando foi dentro do próprio painel.
	if (event.target === settingsBackdrop) setSettingsOpen(false);
});
document.addEventListener("keydown", event => {
	if (event.key === "Escape") setSettingsOpen(false);
});

// =========================================================
// BUSCA
// =========================================================
// Filtra, no lado do cliente, todos os cards visíveis na página
// (catálogos, produtos, destaques e lojas) comparando o texto
// digitado com o conteúdo de texto de cada card.
if (searchInput) {
	searchInput.addEventListener("input", () => {
		const query = searchInput.value.trim().toLowerCase();

		document.querySelectorAll(".catalog-card, .product-card, .highlight-card, .store-card").forEach(card => {
			card.classList.toggle("is-hidden", query && !card.textContent.toLowerCase().includes(query));
		});
	});
}

// =========================================================
// MENU INFERIOR (Início / Chat / Marketing / Perfil)
// =========================================================
// Cada botão do menu tem um atributo data-page indicando a
// seção que ele representa. "perfil" é tratado como uma view
// interna (troca o que aparece na mesma página); os demais
// levam o usuário para outra página do site.
document.querySelectorAll(".bottom-navigation .nav-item").forEach(item => {
	item.addEventListener("click", () => {
		document.querySelectorAll(".bottom-navigation .nav-item").forEach(navItem => navItem.classList.remove("active"));
		item.classList.add("active");

		const page = item.dataset.page;

		if (page) {
			window.location.href = page;
		} else {
			closeProfileView();
		}
	});
});

// Mostra a seção de perfil e esconde o conteúdo padrão da home.
function openProfileView() {
	if (!profileView) return;

	profileMenu?.classList.remove("open");
	profileMenu?.setAttribute("aria-hidden", "true");
	profileView.hidden = false;
	if (header) header.hidden = true;
	if (content) content.hidden = true;
	if (floatingButton) floatingButton.hidden = true;
}

// Esconde a seção de perfil e volta a mostrar o conteúdo padrão da home.
function closeProfileView() {
	if (!profileView) return;

	profileView.hidden = true;
	if (header) header.hidden = false;
	if (content) content.hidden = false;
	if (floatingButton) floatingButton.hidden = false;
}

// Remove a sessão e retorna ao login quando o usuário escolhe Logout
// (tanto pelo menu rápido de perfil quanto pelo painel de configurações).
function logout() {
	localStorage.removeItem("modaCenterSession");
	localStorage.removeItem("modaCenterUserName");
	window.location.href = "index.html?login=1";
}

profileLogout?.addEventListener("click", logout);
settingsLogout?.addEventListener("click", logout);

// =========================================================
// LINK DE ORIGEM EXTERNA (?view=perfil)
// =========================================================
// Mantém compatibilidade com algum link legado que contenha
// ?view=perfil, redirecionando para a tela independente.
const requestedView = new URLSearchParams(window.location.search).get("view");

if (requestedView === "perfil") {
	window.location.href = "perfil_vendedor.html";
}

// =========================================================
// "VER TODOS" / "VER MENOS" DE CADA SEÇÃO
// =========================================================
// Cada seção (catálogos, produtos, destaques, lojas) alterna
// entre mostrar uma lista compacta e mostrar todos os cards.
document.querySelectorAll(".see-all").forEach(button => {
	const list = button.closest(".section")?.querySelector(".catalog-list, .products-list, .highlights-list, .stores-list");

	if (!list) return;

	button.addEventListener("click", () => {
		const expanded = list.classList.toggle("show-all");
		button.childNodes[0].textContent = expanded ? "Ver menos " : "Ver todos ";
		button.setAttribute("aria-expanded", String(expanded));
	});
});

// =========================================================
// FEEDBACK VISUAL DOS BOTÕES
// =========================================================
// Pequena animação de "clique" (encolhe e volta ao tamanho normal)
// em botões que ainda não têm uma ação real implementada, só para
// dar a sensação de resposta ao toque.
document.querySelectorAll(".see-all, .catalog-info button, .highlight-overlay button, .store-card button, .favorite-button, .floating-button").forEach(button => {
	button.addEventListener("click", () => {
		button.animate([
			{ transform: "scale(1)" },
			{ transform: "scale(.96)" },
			{ transform: "scale(1)" }
		], { duration: 180 });
	});
});
