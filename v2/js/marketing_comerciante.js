// =========================================================
// CENTRAL DE MARKETING (marketing_comerciante.html)
// =========================================================
// Esta tela ainda é só uma vitrine: nenhuma das ferramentas
// (cupons, promoções, lives, etc.) tem uma página própria
// implementada. Por isso, ao clicar em qualquer card, damos um
// retorno visual (animação) e um aviso "em desenvolvimento",
// em vez de deixar o clique sem nenhuma resposta.
// =========================================================

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
// CARDS DE FERRAMENTAS
// =========================================================
document.querySelectorAll(".marketing-card").forEach(card => {
	card.addEventListener("click", () => {
		card.animate([
			{ transform: "scale(1)" },
			{ transform: "scale(.97)" },
			{ transform: "scale(1)" }
		], { duration: 180 });

		// Usa o texto do título do card na mensagem do toast.
		const title = card.querySelector("strong")?.textContent || "Esta ferramenta";
		showToast(`${title}: recurso em desenvolvimento.`);
	});
});

// =========================================================
// BANNER "DICAS PARA VENDER MAIS"
// =========================================================
document.querySelector(".banner-button")?.addEventListener("click", () => {
	showToast("Conteúdo de dicas em desenvolvimento.");
});

// =========================================================
// MENU INFERIOR
// =========================================================
// Mesmo comportamento usado em chat.js: cada botão tem um
// data-page com o destino (arquivo + query string opcional).
document.querySelectorAll(".bottom-navigation .nav-item").forEach(button => {
	button.addEventListener("click", () => {
		const page = button.dataset.page;
		if (page) window.location.href = page;
	});
});
