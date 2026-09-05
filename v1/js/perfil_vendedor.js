// =========================================================
// PERFIL DO VENDEDOR (perfil_vendedor.html)
// =========================================================
// Personaliza o perfil com a sessao local e controla as acoes
// da tela: configuracoes, logout e navegacao inferior.

// Recupera os dados salvos pelo fluxo de login.
const session = JSON.parse(localStorage.getItem("modaCenterSession") || "null");
const displayName = session?.email === "admin" ? "Teste" : (session?.name || "Jhon Smit");
const formattedName = String(displayName).trim().replace(/^./, character => character.toUpperCase());
const initials = formattedName.split(/\s+/).map(part => part.charAt(0)).slice(0, 2).join("").toUpperCase();

const profileViewName = document.getElementById("profileViewName");
const profileInitials = document.getElementById("profileInitials");
const settingsName = document.getElementById("settingsName");
const settingsInitials = document.getElementById("settingsInitials");
const settingsBackdrop = document.getElementById("settingsBackdrop");

// Atualiza nome e iniciais nos dois pontos em que a conta aparece.
if (profileViewName) profileViewName.textContent = formattedName;
if (profileInitials) profileInitials.textContent = initials;
if (settingsName) settingsName.textContent = formattedName;
if (settingsInitials) settingsInitials.textContent = initials;

// Abre e fecha o painel de configuracoes sem trocar de pagina.
document.getElementById("profileSettingsButton")?.addEventListener("click", () => {
    settingsBackdrop?.classList.add("open");
    settingsBackdrop?.setAttribute("aria-hidden", "false");
});

document.getElementById("settingsClose")?.addEventListener("click", () => {
    settingsBackdrop?.classList.remove("open");
    settingsBackdrop?.setAttribute("aria-hidden", "true");
});

settingsBackdrop?.addEventListener("click", event => {
    if (event.target === settingsBackdrop) {
        settingsBackdrop.classList.remove("open");
        settingsBackdrop.setAttribute("aria-hidden", "true");
    }
});

// Encerra a sessao e retorna ao formulario de login.
document.getElementById("settingsLogout")?.addEventListener("click", () => {
    localStorage.removeItem("modaCenterSession");
    localStorage.removeItem("modaCenterUserName");
    window.location.href = "index.html?login=1";
});

// Todos os destinos do menu inferior usam arquivos independentes.
document.querySelectorAll(".bottom-navigation .nav-item").forEach(button => {
    button.addEventListener("click", () => {
        const page = button.dataset.page;
        if (page) window.location.href = page;
    });
});
