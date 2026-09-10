const express = require("express");
const bcrypt = require("bcrypt");
const pool = require("./database");
const path = require("path");

const app = express();
const PORT = 3000;

// ========================================
// MIDDLEWARES
// ========================================

app.use(express.json());

app.use(express.static(path.join(__dirname, "public")));

// ========================================
// TESTE DO BANCO DE DADOS
// ========================================

async function testarBanco() {
    try {
        const conexao = await pool.getConnection();

        console.log("✅ Conectado ao MySQL!");
        console.log("✅ Banco: modaCenterUsers");

        conexao.release();

    } catch (error) {
        console.error("❌ Erro ao conectar ao MySQL:");
        console.error(error.message);
    }
}

// ========================================
// CADASTRO DE USUÁRIO
// ========================================

app.post("/api/register", async (req, res) => {

    try {

        const { name, email, password, profile } = req.body;

        // Verifica os campos
        if (!name || !email || !password || !profile) {

            return res.status(400).json({
                sucesso: false,
                mensagem: "Preencha todos os campos."
            });
        }

        // Verifica se o perfil é válido
        if (
            profile !== "cliente" &&
            profile !== "comerciante"
        ) {

            return res.status(400).json({
                sucesso: false,
                mensagem: "Perfil inválido."
            });
        }

        // Verifica se o e-mail já existe
        const [usuarios] = await pool.execute(
            "SELECT id FROM usuarios WHERE email = ?",
            [email]
        );

        if (usuarios.length > 0) {

            return res.status(409).json({
                sucesso: false,
                mensagem: "Este e-mail já está cadastrado."
            });
        }

        // Cria o hash da senha
        const senhaHash = await bcrypt.hash(password, 10);

        // Salva no banco
        const [resultado] = await pool.execute(
            `INSERT INTO usuarios
            (nome, email, senha, perfil)
            VALUES (?, ?, ?, ?)`,
            [
                name,
                email,
                senhaHash,
                profile
            ]
        );

        console.log(`✅ Usuário cadastrado: ${email}`);

        return res.status(201).json({

            sucesso: true,

            mensagem: "Conta criada com sucesso.",

            id: resultado.insertId

        });

    } catch (error) {

        console.error("❌ Erro ao cadastrar usuário:");
        console.error(error);

        return res.status(500).json({

            sucesso: false,

            mensagem: "Erro ao cadastrar usuário."

        });
    }
});

// ========================================
// LOGIN
// ========================================

app.post("/api/login", async (req, res) => {

    try {

        const { email, password } = req.body;

        if (!email || !password) {

            return res.status(400).json({
                sucesso: false,
                mensagem: "Informe e-mail e senha."
            });
        }

        // Procura o usuário
        const [usuarios] = await pool.execute(
            "SELECT * FROM usuarios WHERE email = ?",
            [email]
        );

        if (usuarios.length === 0) {

            return res.status(401).json({
                sucesso: false,
                mensagem: "E-mail ou senha inválidos."
            });
        }

        const usuario = usuarios[0];

        // Compara a senha digitada com o hash
        const senhaCorreta = await bcrypt.compare(
            password,
            usuario.senha
        );

        if (!senhaCorreta) {

            return res.status(401).json({
                sucesso: false,
                mensagem: "E-mail ou senha inválidos."
            });
        }

        // Login realizado
        console.log(`✅ Login realizado: ${email}`);

        return res.json({

            sucesso: true,

            usuario: {
                id: usuario.id,
                name: usuario.nome,
                email: usuario.email,
                profile: usuario.perfil
            }

        });

    } catch (error) {

        console.error("❌ Erro ao fazer login:");
        console.error(error);

        return res.status(500).json({

            sucesso: false,

            mensagem: "Erro ao fazer login."

        });
    }
});

// ========================================
// ROTA PRINCIPAL
// ========================================

app.get("/", (req, res) => {

    res.sendFile(
        path.join(__dirname, "public", "index.html")
    );

});

// ========================================
// INICIA O SERVIDOR
// ========================================

app.listen(PORT, async () => {

    console.log("----------------------------------");
    console.log("🚀 Servidor iniciado!");
    console.log(`🌐 http://localhost:${PORT}`);
    console.log("----------------------------------");

    await testarBanco();

});