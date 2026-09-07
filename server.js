const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const PORT = Number(process.env.PORT || 3000);
const ROOT = path.join(__dirname, "v3");
const DATA_FILE = path.join(__dirname, "server", "data.json");
const MAX_BODY_SIZE = 3 * 1024 * 1024;
const MIME_TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".svg": "image/svg+xml", ".webp": "image/webp" };

function readDatabase() {
    try {
        const database = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
        return { products: Array.isArray(database.products) ? database.products : [], stores: database.stores || {}, orders: Array.isArray(database.orders) ? database.orders : [] };
    } catch (error) {
        return { products: [], stores: {}, orders: [] };
    }
}

function writeDatabase(database) {
    const temporaryFile = `${DATA_FILE}.${process.pid}.tmp`;
    fs.writeFileSync(temporaryFile, JSON.stringify(database, null, 2));
    fs.renameSync(temporaryFile, DATA_FILE);
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
    return { id: String(input.id || crypto.randomUUID()), ownerId: String(input.ownerId), ownerName: String(input.ownerName || "Loja Moda Center"), name, description: String(input.description || ""), price, category: String(input.category || "Produto"), segments: Array.isArray(input.segments) ? input.segments : [], image: input.image || null, quantity: Math.max(0, Number(input.quantity || 0)), discount: Math.min(100, Math.max(0, Number(input.discount || 0))), wholesale, salesCount: Math.max(0, Number(input.salesCount || 0)), ratings: Array.isArray(input.ratings) ? input.ratings : [], createdAt: input.createdAt || Date.now() };
}

async function handleApi(request, response, url) {
    const database = readDatabase();
    if (request.method === "GET" && url.pathname === "/api/health") return sendJson(response, 200, { ok: true, timestamp: new Date().toISOString() });
    if (request.method === "GET" && url.pathname === "/api/catalog") return sendJson(response, 200, { products: database.products, stores: database.stores });

    if (request.method === "GET" && url.pathname === "/api/orders") {
        const merchantId = url.searchParams.get("merchantId");
        const clientId = url.searchParams.get("clientId");
        const orders = database.orders.filter(order => !merchantId && !clientId || merchantId && order.items.some(item => String(item.ownerId) === String(merchantId)) || clientId && String(order.clientId) === String(clientId));
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
            if (!product || Number(product.quantity || 0) < quantity) return null;
            return { productId: product.id, ownerId: product.ownerId, ownerName: product.ownerName, name: product.name, price: product.price, quantity };
        });
        if (items.some(item => !item)) return sendJson(response, 409, { error: "Estoque insuficiente para um dos produtos" });
        items.forEach(item => {
            const product = database.products.find(entry => String(entry.id) === String(item.productId));
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
