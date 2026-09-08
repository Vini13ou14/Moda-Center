const SESSION_KEY = "modaCenterSession";
const USERS_KEY = "modaCenterUsers";
const PURCHASES_KEY = "modaCenterPurchases";
const session = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
const API_ENABLED = window.location.protocol !== "file:";

if (!session || session.profile !== "cliente") {
    window.location.href = "index.html?login=1";
    throw new Error("Sessao de cliente ausente");
}

function updatePresence(status = "online") {
    if (!API_ENABLED) return;
    fetch("/api/presence", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: session.id, status }) }).catch(() => {});
}

updatePresence();
window.setInterval(() => updatePresence(), 15000);
window.addEventListener("pagehide", () => updatePresence("offline"));

const profileAvatar = document.getElementById("profileAvatar");
const profileName = document.getElementById("profileName");
const profileEmail = document.getElementById("profileEmail");
const purchaseCount = document.getElementById("purchaseCount");
const itemCount = document.getElementById("itemCount");
const profileNote = document.getElementById("profileNote");
const editBackdrop = document.getElementById("editBackdrop");
const profileForm = document.getElementById("profileForm");
const nameInput = document.getElementById("nameInput");
const photoInput = document.getElementById("photoInput");
const photoPreview = document.getElementById("photoPreview");
const editNote = document.getElementById("editNote");
let pendingAvatar = session.avatar || "";

function initials(name) {
    return String(name || "Cliente").trim().split(/\s+/).map(part => part[0]).slice(0, 2).join("").toUpperCase() || "CL";
}

function renderAvatar(image, name) {
    profileAvatar.innerHTML = image ? `<img src="${image}" alt="Foto de ${name}">` : initials(name);
}

function renderProfile(name, email, image) {
    profileName.textContent = name;
    profileEmail.textContent = email;
    renderAvatar(image, name);
}

function getUsers() {
    try {
        const users = JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
        return Array.isArray(users) ? users : [];
    } catch (error) {
        return [];
    }
}

function renderLocalMetrics() {
    const purchases = JSON.parse(localStorage.getItem(PURCHASES_KEY) || "{}");
    const boughtProducts = Array.isArray(purchases[session.id]) ? purchases[session.id] : [];
    purchaseCount.textContent = boughtProducts.length;
    itemCount.textContent = boughtProducts.length;
}

async function loadRemoteMetrics() {
    if (window.location.protocol === "file:") return;
    try {
        const response = await fetch(`/api/orders?clientId=${encodeURIComponent(session.id)}`, { cache: "no-store" });
        if (!response.ok) return;
        const orders = (await response.json()).orders || [];
        purchaseCount.textContent = orders.length;
        itemCount.textContent = orders.reduce((total, order) => total + (order.items || []).reduce((subtotal, item) => subtotal + Number(item.quantity || 0), 0), 0);
    } catch (error) {
        // Os dados locais continuam visiveis quando a API nao estiver disponivel.
    }
}

renderProfile(session.name || "Cliente", session.email || "", pendingAvatar);
renderLocalMetrics();
void loadRemoteMetrics();

document.getElementById("editProfileButton").addEventListener("click", () => {
    nameInput.value = session.name || "";
    photoInput.value = "";
    editNote.textContent = "";
    if (pendingAvatar) {
        photoPreview.src = pendingAvatar;
        photoPreview.hidden = false;
    } else {
        photoPreview.hidden = true;
    }
    editBackdrop.hidden = false;
    nameInput.focus();
});
document.getElementById("editPhotoButton").addEventListener("click", () => document.getElementById("editProfileButton").click());
document.getElementById("closeEdit").addEventListener("click", () => { editBackdrop.hidden = true; });
editBackdrop.addEventListener("click", event => { if (event.target === editBackdrop) editBackdrop.hidden = true; });

document.getElementById("logoutButton").addEventListener("click", () => {
    localStorage.removeItem(SESSION_KEY);
    window.location.href = "index.html?login=1";
});

photoInput.addEventListener("change", () => {
    const file = photoInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { pendingAvatar = reader.result; photoPreview.src = pendingAvatar; photoPreview.hidden = false; };
    reader.readAsDataURL(file);
});

profileForm.addEventListener("submit", event => {
    event.preventDefault();
    const name = nameInput.value.trim();
    const users = getUsers();
    if (name.length < 2) {
        editNote.textContent = "Informe um nome com pelo menos 2 caracteres.";
        return;
    }
    if (users.some(user => String(user.id) !== String(session.id) && String(user.name || "").trim().toLowerCase() === name.toLowerCase())) {
        editNote.textContent = "Este nome de usuário já está em uso.";
        return;
    }
    const user = users.find(item => String(item.id) === String(session.id));
    if (user) {
        user.name = name;
        user.avatar = pendingAvatar || null;
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
    }
    const updatedSession = { ...session, name, avatar: pendingAvatar || null };
    localStorage.setItem(SESSION_KEY, JSON.stringify(updatedSession));
    Object.assign(session, updatedSession);
    renderProfile(name, session.email || "", pendingAvatar);
    profileNote.textContent = "Perfil atualizado com sucesso.";
    editBackdrop.hidden = true;
});
