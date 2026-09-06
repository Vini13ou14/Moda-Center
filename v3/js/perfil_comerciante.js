// =========================================================
// PERFIL DO COMERCIANTE (perfil_comerciante.html)
// =========================================================
// Personaliza o perfil com a sessao local e controla as acoes
// da tela: configuracoes, logout e navegacao inferior.

// Recupera os dados salvos pelo fluxo de login.
// A sessão já foi lida e validada por js/comerciante-guard.js (carregado
// antes deste arquivo no HTML), então só reaproveitamos o resultado
// em vez de ler o localStorage de novo.
const session = window.comercianteSession;
const displayName = session?.email === "admin" ? "Teste" : (session?.name || "Jhon Smit");
const formattedName = String(displayName).trim().replace(/^./, character => character.toUpperCase());
const initials = formattedName.split(/\s+/).map(part => part.charAt(0)).slice(0, 2).join("").toUpperCase();

const profileViewName = document.getElementById("profileViewName");
const profileInitials = document.getElementById("profileInitials");
const profileStoreName = document.getElementById("profileStoreName");
const settingsName = document.getElementById("settingsName");
const settingsInitials = document.getElementById("settingsInitials");
const settingsBackdrop = document.getElementById("settingsBackdrop");
const profileAvatarImage = document.getElementById("profileAvatarImage");
const profileEditBackdrop = document.getElementById("profileEditBackdrop");
const profileEditForm = document.getElementById("profileEditForm");
const editProfileName = document.getElementById("editProfileName");
const editProfileEmail = document.getElementById("editProfileEmail");
const editStoreName = document.getElementById("editStoreName");
const editProfileImage = document.getElementById("editProfileImage");
const profileEditPreview = document.getElementById("profileEditPreview");
const editStoreImage = document.getElementById("editStoreImage");
const storeEditPreview = document.getElementById("storeEditPreview");
const profileEditNote = document.getElementById("profileEditNote");
let pendingProfileImage = session?.avatar || "";
let pendingStoreImage = "";

// Atualiza nome e iniciais nos dois pontos em que a conta aparece.
if (profileViewName) profileViewName.textContent = formattedName;
if (profileInitials) profileInitials.textContent = initials;
if (settingsName) settingsName.textContent = formattedName;
if (settingsInitials) settingsInitials.textContent = initials;

// Mostra o nome da loja cadastrado em cadastro-loja.html (primeiro
// acesso do comerciante), guardado em "modaCenterStores".
const stores = JSON.parse(localStorage.getItem("modaCenterStores") || "{}");
const myStore = stores[session?.id];

if (profileStoreName && myStore?.name) {
	profileStoreName.textContent = myStore.name;
}

// Mostra a quantidade real de produtos cadastrados por este
// comerciante (ver produto-novo.html), no lugar do número fixo de
// exemplo que existia aqui antes.
const allProducts = JSON.parse(localStorage.getItem("modaCenterProducts") || "{}");
const profileProductsCount = document.getElementById("profileProductsCount");

if (profileProductsCount) {
	profileProductsCount.textContent = (allProducts[session?.id] || []).length;
}

function updateProfileAvatar(image) {
    if (image) {
        profileInitials.hidden = true;
        profileAvatarImage.src = image;
        profileAvatarImage.hidden = false;
        settingsInitials.textContent = "";
        settingsInitials.style.backgroundImage = `url("${image}")`;
        settingsInitials.classList.add("has-image");
    } else {
        profileInitials.hidden = false;
        profileAvatarImage.hidden = true;
        settingsInitials.textContent = initials;
        settingsInitials.style.backgroundImage = "";
        settingsInitials.classList.remove("has-image");
    }
}

updateProfileAvatar(pendingProfileImage);

function openProfileEditor() {
    const currentUser = JSON.parse(localStorage.getItem("modaCenterUsers") || "[]")
        .find(user => String(user.id) === String(session?.id)) || session;
    const currentStore = stores[session?.id] || {};

    editProfileName.value = currentUser?.name || "";
    editProfileEmail.value = currentUser?.email || "";
    editStoreName.value = currentStore.name || "";
    pendingStoreImage = currentStore.image || "";
    profileEditForm.querySelectorAll('input[name="segment"]').forEach(input => {
        input.checked = (currentStore.segments || []).includes(input.value);
    });
    editProfileImage.value = "";
    editStoreImage.value = "";
    profileEditNote.textContent = "";
    if (pendingProfileImage) {
        profileEditPreview.src = pendingProfileImage;
        profileEditPreview.hidden = false;
    } else {
        profileEditPreview.hidden = true;
    }
    if (pendingStoreImage) {
        storeEditPreview.src = pendingStoreImage;
        storeEditPreview.hidden = false;
    } else {
        storeEditPreview.hidden = true;
    }
    profileEditBackdrop.classList.add("open");
    profileEditBackdrop.setAttribute("aria-hidden", "false");
}

function closeProfileEditor() {
    profileEditBackdrop.classList.remove("open");
    profileEditBackdrop.setAttribute("aria-hidden", "true");
}

// Abre e fecha o painel de configuracoes sem trocar de pagina.
document.getElementById("profileSettingsButton")?.addEventListener("click", () => {
    settingsBackdrop?.classList.add("open");
    settingsBackdrop?.setAttribute("aria-hidden", "false");
});

document.getElementById("settingsClose")?.addEventListener("click", () => {
    settingsBackdrop?.classList.remove("open");
    settingsBackdrop?.setAttribute("aria-hidden", "true");
});

document.getElementById("editProfileButton")?.addEventListener("click", openProfileEditor);
document.querySelector(".profile-camera")?.addEventListener("click", openProfileEditor);
document.getElementById("profileEditClose")?.addEventListener("click", closeProfileEditor);
profileEditBackdrop?.addEventListener("click", event => {
    if (event.target === profileEditBackdrop) closeProfileEditor();
});

editProfileImage?.addEventListener("change", () => {
    const file = editProfileImage.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
        pendingProfileImage = reader.result;
        profileEditPreview.src = pendingProfileImage;
        profileEditPreview.hidden = false;
    };
    reader.readAsDataURL(file);
});

editStoreImage?.addEventListener("change", () => {
    const file = editStoreImage.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
        pendingStoreImage = reader.result;
        storeEditPreview.src = pendingStoreImage;
        storeEditPreview.hidden = false;
    };
    reader.readAsDataURL(file);
});

profileEditForm?.addEventListener("submit", event => {
    event.preventDefault();
    const name = editProfileName.value.trim();
    const email = editProfileEmail.value.trim().toLowerCase();
    const storeName = editStoreName.value.trim();
    const segments = [...profileEditForm.querySelectorAll('input[name="segment"]:checked')].map(input => input.value);
    const users = JSON.parse(localStorage.getItem("modaCenterUsers") || "[]");
    const user = users.find(item => String(item.id) === String(session?.id));

    if (!name || !email || !storeName || segments.length === 0) {
        profileEditNote.textContent = "Preencha os dados e selecione pelo menos um segmento.";
        return;
    }

    if (String(session?.id) !== "admin" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        profileEditNote.textContent = "Informe um e-mail válido com @.";
        return;
    }

    if (users.some(item => String(item.id) !== String(session?.id) && item.email.toLowerCase() === email)) {
        profileEditNote.textContent = "Este e-mail já está cadastrado.";
        return;
    }

    if (user) {
        user.name = name;
        user.email = email;
        user.avatar = pendingProfileImage || null;
    }

    localStorage.setItem("modaCenterUsers", JSON.stringify(users));
    const updatedSession = { ...session, name, email, avatar: pendingProfileImage || null };
    localStorage.setItem("modaCenterSession", JSON.stringify(updatedSession));
    Object.assign(session, updatedSession);
    stores[session.id] = { ...stores[session.id], name: storeName, segments, image: pendingStoreImage || null, createdAt: stores[session.id]?.createdAt || Date.now() };
    localStorage.setItem("modaCenterStores", JSON.stringify(stores));

    profileViewName.textContent = name.charAt(0).toUpperCase() + name.slice(1);
    profileStoreName.textContent = storeName;
    settingsName.textContent = name;
    updateProfileAvatar(pendingProfileImage);
    closeProfileEditor();
    settingsBackdrop.classList.remove("open");
    settingsBackdrop.setAttribute("aria-hidden", "true");
});

settingsBackdrop?.addEventListener("click", event => {
    if (event.target === settingsBackdrop) {
        settingsBackdrop.classList.remove("open");
        settingsBackdrop.setAttribute("aria-hidden", "true");
    }
});

// Fecha o painel de configurações também com a tecla Esc, do mesmo
// jeito que os modais das outras páginas do site.
document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
        settingsBackdrop?.classList.remove("open");
        settingsBackdrop?.setAttribute("aria-hidden", "true");
        closeProfileEditor();
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
