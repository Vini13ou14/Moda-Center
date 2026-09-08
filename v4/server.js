const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const PORT = Number(process.env.PORT || 3000);
// O site (index.html, css/, js/, assets/...) fica direto ao lado deste
// arquivo. Antes havia uma lista de pastas possíveis aqui ("v3",
// "Moda-Center-main/v3", ...) porque o projeto tinha cópias soltas e
// desatualizadas em vários lugares — isso foi limpo, então agora o
// servidor sempre serve a partir da própria pasta do projeto.
const ROOT = __dirname;
const DATA_FILE = path.join(__dirname, "server", "data.json");
const MAX_BODY_SIZE = 3 * 1024 * 1024;
const MIME_TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".svg": "image/svg+xml", ".webp": "image/webp" };

function readDatabase() {
    try {
        const database = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
        return { products: Array.isArray(database.products) ? database.products : [], stores: database.stores || {}, orders: Array.isArray(database.orders) ? database.orders : [], chats: Array.isArray(database.chats) ? database.chats : [], presence: database.presence || {}, users: Array.isArray(database.users) ? database.users : [] };
    } catch (error) {
        return { products: [], stores: {}, orders: [], chats: [], presence: {}, users: [] };
    }
}

function writeDatabase(database) {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    const temporaryFile = `${DATA_FILE}.${process.pid}.tmp`;
    const content = JSON.stringify(database, null, 2);
    fs.writeFileSync(temporaryFile, content);
    try {
        fs.renameSync(temporaryFile, DATA_FILE);
    } catch (error) {
        try {
            fs.writeFileSync(DATA_FILE, content);
        } finally {
            fs.rmSync(temporaryFile, { force: true });
        }
    }
}

function sendJson(response, status, payload) {
    response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
    response.end(JSON.stringify(payload));
}

function readBody(request) {
    return new Promise((resolve, reject) => {
        let body = "";
        request.on("data", chunk => {
            body += chunk;
            if (Buffer.byteLength(body) > MAX_BODY_SIZE) reject(new Error("Payload muito grande"));
        });
        request.on("end", () => {
            try { resolve(body ? JSON.parse(body) : {}); }
            catch (error) { reject(new Error("JSON invalido")); }
        });
        request.on("error", reject);
    });
}

function normalizeProduct(input) {
    const name = String(input.name || "").trim();
    const price = Number(input.price);
    if (!name || !Number.isFinite(price) || price <= 0) return null;
    const wholesale = input.wholesale && Number(input.wholesale.minQuantity) >= 2 && Number(input.wholesale.price) > 0 ? { minQuantity: Number(input.wholesale.minQuantity), price: Number(input.wholesale.price) } : null;
    const variations = Array.isArray(input.variations) ? input.variations.map(variation => ({ id: String(variation.id || crypto.randomUUID()), color: String(variation.color || "").trim(), size: String(variation.size || "").trim(), quantity: Math.max(0, Number(variation.quantity || 0)) })).filter(variation => variation.color && variation.size) : [];
    const quantity = variations.length ? variations.reduce((total, variation) => total + variation.quantity, 0) : Math.max(0, Number(input.quantity || 0));
    return { id: String(input.id || crypto.randomUUID()), ownerId: String(input.ownerId), ownerName: String(input.ownerName || "Loja Moda Center"), name, description: String(input.description || ""), price, category: String(input.category || "Produto"), segments: Array.isArray(input.segments) ? input.segments : [], image: input.image || null, quantity, variations, discount: Math.min(100, Math.max(0, Number(input.discount || 0))), wholesale, salesCount: Math.max(0, Number(input.salesCount || 0)), ratings: Array.isArray(input.ratings) ? input.ratings : [], createdAt: input.createdAt || Date.now() };
}

async function handleApi(request, response, url) {
    const database = readDatabase();
    if (request.method === "GET" && url.pathname === "/api/health") return sendJson(response, 200, { ok: true, timestamp: new Date().toISOString() });
    if (request.method === "GET" && url.pathname === "/api/catalog") return sendJson(response, 200, { products: database.products, stores: database.stores });

    const storeMatch = url.pathname.match(/^\/api\/stores\/([^/]+)$/);
    if (request.method === "GET" && storeMatch) return sendJson(response, 200, { store: database.stores[decodeURIComponent(storeMatch[1])] || null });
    if (request.method === "PUT" && storeMatch) {
        const ownerId = decodeURIComponent(storeMatch[1]);
        const input = await readBody(request);
        const segments = Array.isArray(input.segments) ? input.segments.map(item => String(item).trim()).filter(Boolean) : String(input.segments || "").split(",").map(item => item.trim()).filter(Boolean);
        if (String(input.ownerId) !== ownerId || !String(input.name || "").trim() || !segments.length) return sendJson(response, 400, { error: "Dados da loja invalidos" });
        database.stores[ownerId] = { name: String(input.name).trim(), segments, image: input.image || null, createdAt: input.createdAt || Date.now() };
        writeDatabase(database);
        return sendJson(response, 200, { store: database.stores[ownerId] });
    }

    if (request.method === "POST" && url.pathname === "/api/auth/sync") {
        const input = await readBody(request);
        const users = Array.isArray(input.users) ? input.users : [];
        users.forEach(user => {
            if (!user.email || !user.password || database.users.some(item => item.email === String(user.email).toLowerCase())) return;
            database.users.push({ id: String(user.id || crypto.randomUUID()), name: String(user.name || "Usuario").trim(), email: String(user.email).toLowerCase(), password: String(user.password), profile: user.profile === "comerciante" ? "comerciante" : "cliente", avatar: user.avatar || null });
        });
        writeDatabase(database);
        return sendJson(response, 200, { ok: true });
    }

    if (request.method === "POST" && url.pathname === "/api/auth/register") {

    const input = await readBody(request);

    const name = String(input.name || "").trim();

    const email = String(input.email || "")
        .trim()
        .toLowerCase();

    const password = String(input.password || "");

    const registrationId = String(
        input.registrationId || ""
    ).trim();


    // ==========================================
    // VALIDAÇÃO
    // ==========================================

    if (
        name.length < 2 ||
        !email ||
        password.length < 1
    ) {
        return sendJson(
            response,
            400,
            {
                error: "Dados de cadastro invalidos"
            }
        );
    }


    // ==========================================
    // ID DA TENTATIVA DE CADASTRO
    // ==========================================

    const userId =
        registrationId ||
        crypto.randomUUID();


    // ==========================================
    // VERIFICA SE O E-MAIL JÁ EXISTE
    // ==========================================

    const existingUser =
        database.users.find(
            user => user.email === email
        );


    if (existingUser) {

        // ------------------------------------------
        // IMPORTANTE:
        // Se for a MESMA tentativa de cadastro,
        // significa que o servidor provavelmente
        // criou a conta mas a resposta não chegou
        // ao navegador.
        // ------------------------------------------

        if (
            String(existingUser.id) ===
            String(userId)
        ) {

            return sendJson(
                response,
                200,
                {
                    user: {
                        id: existingUser.id,
                        name: existingUser.name,
                        email: existingUser.email,
                        avatar: existingUser.avatar || null,
                        profile: existingUser.profile
                    }
                }
            );
        }


        // É outro cadastro tentando usar o mesmo e-mail.

        return sendJson(
            response,
            409,
            {
                error:
                    "Este e-mail ja esta cadastrado"
            }
        );
    }


    // ==========================================
    // VERIFICA NOME DUPLICADO
    // ==========================================

    const existingName =
        database.users.find(
            user =>
                String(user.name || "")
                    .trim()
                    .toLowerCase() ===
                name.toLowerCase()
        );


    if (existingName) {

        return sendJson(
            response,
            409,
            {
                error:
                    "Este nome de usuario ja esta em uso"
            }
        );
    }


    // ==========================================
    // CRIA NOVO USUÁRIO
    // ==========================================

    const user = {

        id: userId,

        name,

        email,

        password,

        profile:
            input.profile === "comerciante"
                ? "comerciante"
                : "cliente",

        avatar:
            input.avatar || null

    };


    database.users.push(user);


    // ==========================================
    // SALVA NO BANCO
    // ==========================================

    writeDatabase(database);


    // ==========================================
    // RESPONDE SEM SENHA
    // ==========================================

    return sendJson(
        response,
        201,
        {
            user: {

                id: user.id,

                name: user.name,

                email: user.email,

                avatar:
                    user.avatar || null,

                profile:
                    user.profile

            }
        }
    );
}

    if (request.method === "POST" && url.pathname === "/api/auth/login") {
        const input = await readBody(request);
        const email = String(input.email || "").trim().toLowerCase();
        const user = database.users.find(item => item.email === email && item.password === String(input.password || ""));
        if (!user) return sendJson(response, 401, { error: "E-mail ou senha invalidos" });
        return sendJson(response, 200, { user: { id: user.id, name: user.name, email: user.email, avatar: user.avatar || null, profile: user.profile } });
    }

    if (request.method === "GET" && url.pathname === "/api/chats") {
        const userId = String(url.searchParams.get("userId") || "");
        if (!userId) return sendJson(response, 400, { error: "userId obrigatorio" });
        return sendJson(response, 200, { chats: database.chats.filter(chat => String(chat.clientId) === userId || String(chat.merchantId) === userId) });
    }

    if (request.method === "POST" && url.pathname === "/api/chats") {
        const input = await readBody(request);
        if (!input.id || !input.clientId || !input.merchantId) return sendJson(response, 400, { error: "Conversa invalida" });
        const existingIndex = database.chats.findIndex(chat => String(chat.id) === String(input.id));
        const chat = { ...input, messages: Array.isArray(input.messages) ? input.messages : [], unreadCounts: input.unreadCounts || {}, updatedAt: Number(input.updatedAt || Date.now()) };
        if (existingIndex >= 0) database.chats[existingIndex] = { ...database.chats[existingIndex], ...chat, messages: chat.messages.length ? chat.messages : database.chats[existingIndex].messages || [] };
        else database.chats.push(chat);
        writeDatabase(database);
        return sendJson(response, 201, { chat });
    }

    const chatActionMatch = url.pathname.match(/^\/api\/chats\/([^/]+)$/);
    if ((request.method === "PATCH" || request.method === "DELETE") && chatActionMatch) {
        const chatIndex = database.chats.findIndex(item => String(item.id) === decodeURIComponent(chatActionMatch[1]));
        if (chatIndex < 0) return sendJson(response, 404, { error: "Conversa nao encontrada" });
        const input = await readBody(request);
        const chat = database.chats[chatIndex];
        if (String(input.actorId) !== String(chat.clientId) && String(input.actorId) !== String(chat.merchantId)) return sendJson(response, 403, { error: "Usuario nao participa desta conversa" });
        if (request.method === "DELETE") database.chats.splice(chatIndex, 1);
        else {
            if (input.action !== "pin") return sendJson(response, 400, { error: "Acao invalida" });
            chat.pinned = Boolean(input.pinned);
        }
        writeDatabase(database);
        return sendJson(response, 200, { ok: true });
    }

    const chatMessageMatch = url.pathname.match(/^\/api\/chats\/([^/]+)\/messages$/);
    if (request.method === "POST" && chatMessageMatch) {
        const input = await readBody(request);
        const chat = database.chats.find(item => String(item.id) === decodeURIComponent(chatMessageMatch[1]));
        if (!chat || !input.senderId || !String(input.text || "").trim()) return sendJson(response, 400, { error: "Mensagem invalida" });
        chat.messages = Array.isArray(chat.messages) ? chat.messages : [];
        chat.messages.push({ id: input.id || crypto.randomUUID(), senderId: String(input.senderId), text: String(input.text).trim(), time: input.time || new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) });
        chat.updatedAt = Date.now();
        chat.unreadCounts = chat.unreadCounts || {};
        chat.unreadCounts[String(input.recipientId)] = Number(chat.unreadCounts[String(input.recipientId)] || 0) + 1;
        chat.unreadFor = String(input.recipientId);
        writeDatabase(database);
        return sendJson(response, 201, { chat });
    }

    const messageActionMatch = url.pathname.match(/^\/api\/chats\/([^/]+)\/messages\/([^/]+)$/);
    if ((request.method === "PATCH" || request.method === "DELETE") && messageActionMatch) {
        const chat = database.chats.find(item => String(item.id) === decodeURIComponent(messageActionMatch[1]));
        const message = chat?.messages?.find(item => String(item.id) === decodeURIComponent(messageActionMatch[2]));
        if (!chat || !message) return sendJson(response, 404, { error: "Mensagem nao encontrada" });
        const input = request.method === "PATCH" ? await readBody(request) : await readBody(request);
        if ((input.action === "edit" || request.method === "DELETE") && String(input.actorId) !== String(message.senderId)) return sendJson(response, 403, { error: "Somente o autor pode alterar esta mensagem" });
        if (request.method === "DELETE") chat.messages = chat.messages.filter(item => String(item.id) !== String(message.id));
        else {
            if (input.action === "pin") message.pinned = Boolean(input.pinned);
            if (input.action === "edit" && String(input.text || "").trim()) { message.text = String(input.text).trim(); message.edited = true; }
        }
        chat.updatedAt = Date.now();
        writeDatabase(database);
        return sendJson(response, 200, { chat });
    }

    if (request.method === "GET" && url.pathname === "/api/presence") return sendJson(response, 200, { presence: database.presence });
    if (request.method === "POST" && url.pathname === "/api/presence") {
        const input = await readBody(request);
        if (!input.userId) return sendJson(response, 400, { error: "userId obrigatorio" });
        database.presence[String(input.userId)] = { status: input.status === "offline" ? "offline" : "online", lastSeen: Date.now() };
        writeDatabase(database);
        return sendJson(response, 200, { presence: database.presence[String(input.userId)] });
    }

    if (request.method === "GET" && url.pathname === "/api/orders") {
        const merchantId = url.searchParams.get("merchantId");
        const clientId = url.searchParams.get("clientId");
        const orders = database.orders
            .filter(order => !merchantId && !clientId || merchantId && order.items.some(item => String(item.ownerId) === String(merchantId)) || clientId && String(order.clientId) === String(clientId))
            .map(order => merchantId ? { ...order, items: order.items.filter(item => String(item.ownerId) === String(merchantId)), total: order.items.filter(item => String(item.ownerId) === String(merchantId)).reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0) } : order);
        return sendJson(response, 200, { orders });
    }

    if (request.method === "POST" && url.pathname === "/api/products") {
        const input = await readBody(request);
        if (!input.ownerId) return sendJson(response, 400, { error: "ownerId obrigatorio" });
        const product = normalizeProduct(input);
        if (!product) return sendJson(response, 400, { error: "Produto invalido" });
        const existingIndex = database.products.findIndex(item => String(item.id) === product.id && String(item.ownerId) === product.ownerId);
        if (existingIndex >= 0) database.products[existingIndex] = { ...database.products[existingIndex], ...product };
        else database.products.push(product);
        writeDatabase(database);
        return sendJson(response, 201, { product });
    }

    const productUpdateMatch = url.pathname.match(/^\/api\/products\/([^/]+)$/);
    if (request.method === "PATCH" && productUpdateMatch) {
        const input = await readBody(request);
        const product = database.products.find(item => item.id === decodeURIComponent(productUpdateMatch[1]));
        if (!product || String(input.ownerId) !== String(product.ownerId)) return sendJson(response, 404, { error: "Produto nao encontrado" });
        const updated = normalizeProduct({ ...product, ...input, id: product.id, ownerId: product.ownerId });
        database.products[database.products.indexOf(product)] = updated;
        writeDatabase(database);
        return sendJson(response, 200, { product: updated });
    }

    const purchaseMatch = url.pathname.match(/^\/api\/products\/([^/]+)\/purchase$/);
    if (request.method === "POST" && purchaseMatch) {
        const product = database.products.find(item => item.id === decodeURIComponent(purchaseMatch[1]));
        if (!product) return sendJson(response, 404, { error: "Produto nao encontrado" });
        if (Number(product.quantity || 0) < 1) return sendJson(response, 409, { error: "Produto esgotado" });
        product.quantity -= 1;
        product.salesCount = Number(product.salesCount || 0) + 1;
        writeDatabase(database);
        return sendJson(response, 200, { product });
    }

    if (request.method === "POST" && url.pathname === "/api/orders") {
        const input = await readBody(request);
        const clientId = String(input.clientId || "");
        const clientName = String(input.clientName || "Cliente");
        const requestedItems = Array.isArray(input.items) ? input.items : [];
        if (!clientId || !requestedItems.length) return sendJson(response, 400, { error: "Pedido invalido" });
        const items = requestedItems.map(item => {
            const product = database.products.find(entry => String(entry.id) === String(item.productId));
            const quantity = Math.max(1, Number(item.quantity || 1));
            const variation = Array.isArray(product?.variations) ? product.variations.find(entry => String(entry.id) === String(item.variationId)) : null;
            const stock = variation ? Number(variation.quantity || 0) : Number(product?.quantity || 0);
            if (!product || stock < quantity) return null;
            return { productId: product.id, variationId: variation?.id || null, variation: variation ? { color: variation.color, size: variation.size } : null, ownerId: product.ownerId, ownerName: product.ownerName, name: product.name, price: product.price, quantity };
        });
        if (items.some(item => !item)) return sendJson(response, 409, { error: "Estoque insuficiente para um dos produtos" });
        items.forEach(item => {
            const product = database.products.find(entry => String(entry.id) === String(item.productId));
            const variation = item.variationId && Array.isArray(product.variations) ? product.variations.find(entry => String(entry.id) === String(item.variationId)) : null;
            if (variation) variation.quantity -= item.quantity;
            product.quantity -= item.quantity;
            product.salesCount = Number(product.salesCount || 0) + item.quantity;
        });
        const order = { id: crypto.randomUUID(), clientId, clientName, items, total: items.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0), status: "recebido", createdAt: Date.now(), updatedAt: Date.now() };
        database.orders.push(order);
        writeDatabase(database);
        return sendJson(response, 201, { order, products: database.products });
    }

    const orderStatusMatch = url.pathname.match(/^\/api\/orders\/([^/]+)\/status$/);
    if (request.method === "PATCH" && orderStatusMatch) {
        const input = await readBody(request);
        const allowedStatuses = ["recebido", "preparando", "postado", "enviado", "entregue", "cancelado"];
        const order = database.orders.find(item => item.id === decodeURIComponent(orderStatusMatch[1]));
        if (!order || !allowedStatuses.includes(input.status)) return sendJson(response, 400, { error: "Status invalido" });
        order.status = input.status;
        order.updatedAt = Date.now();
        writeDatabase(database);
        return sendJson(response, 200, { order });
    }

    const orderDeleteMatch = url.pathname.match(/^\/api\/orders\/([^/]+)$/);
    if (request.method === "DELETE" && orderDeleteMatch) {
        const input = await readBody(request);
        const orderIndex = database.orders.findIndex(item => item.id === decodeURIComponent(orderDeleteMatch[1]));
        const order = database.orders[orderIndex];
        const merchantId = String(input.merchantId || "");
        if (!order || !merchantId || order.status !== "entregue" || !order.items.some(item => String(item.ownerId) === merchantId)) return sendJson(response, 403, { error: "Somente o vendedor pode apagar pedidos entregues" });
        database.orders.splice(orderIndex, 1);
        writeDatabase(database);
        return sendJson(response, 200, { ok: true });
    }

    const orderConfirmMatch = url.pathname.match(/^\/api\/orders\/([^/]+)\/confirm$/);
    if (request.method === "PATCH" && orderConfirmMatch) {
        const input = await readBody(request);
        const order = database.orders.find(item => item.id === decodeURIComponent(orderConfirmMatch[1]));
        if (!order || String(order.clientId) !== String(input.clientId) || !["enviado", "entregue"].includes(order.status)) return sendJson(response, 403, { error: "O cliente ainda nao pode confirmar este pedido" });
        order.status = "entregue";
        order.confirmedAt = Date.now();
        order.updatedAt = Date.now();
        writeDatabase(database);
        return sendJson(response, 200, { order });
    }

    const ratingMatch = url.pathname.match(/^\/api\/products\/([^/]+)\/ratings$/);
    if (request.method === "POST" && ratingMatch) {
        const input = await readBody(request);
        const value = Number(input.value);
        const clientId = String(input.clientId || "");
        const product = database.products.find(item => item.id === decodeURIComponent(ratingMatch[1]));
        if (!product || !clientId || !Number.isInteger(value) || value < 1 || value > 5) return sendJson(response, 400, { error: "Avaliacao invalida" });
        const deliveredPurchase = database.orders.some(order => String(order.clientId) === clientId && order.status === "entregue" && order.items.some(item => String(item.productId) === String(product.id)));
        if (!deliveredPurchase) return sendJson(response, 403, { error: "A avaliacao so esta disponivel apos a entrega" });
        product.ratings = Array.isArray(product.ratings) ? product.ratings : [];
        const existing = product.ratings.find(rating => String(rating.clientId) === clientId);
        if (existing) { existing.value = value; if (input.media) existing.media = input.media; }
        else product.ratings.push({ clientId, value, media: input.media || null, createdAt: Date.now() });
        writeDatabase(database);
        return sendJson(response, 200, { product });
    }

    sendJson(response, 404, { error: "Rota nao encontrada" });
}

function serveStatic(response, urlPath) {
    const requested = urlPath === "/" ? "/index.html" : urlPath;
    const filePath = path.resolve(ROOT, `.${requested}`);
    if (!filePath.startsWith(`${ROOT}${path.sep}`)) return sendJson(response, 403, { error: "Acesso negado" });
    fs.readFile(filePath, (error, content) => {
        if (error) return sendJson(response, error.code === "ENOENT" ? 404 : 500, { error: "Arquivo nao encontrado" });
        response.writeHead(200, { "Content-Type": MIME_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream", "Cache-Control": "no-cache" });
        response.end(content);
    });
}

const server = http.createServer(async (request, response) => {
    const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
    try {
        if (url.pathname.startsWith("/api/")) await handleApi(request, response, url);
        else serveStatic(response, url.pathname);
    } catch (error) {
        console.error(error);
        sendJson(response, 500, { error: "Erro interno" });
    }
});

server.listen(PORT, "0.0.0.0", () => console.log(`Moda Center em http://localhost:${PORT}`));
