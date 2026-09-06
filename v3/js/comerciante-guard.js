// =========================================================
// GUARDA DE ACESSO DA ÁREA DO COMERCIANTE
// =========================================================
// Compartilhado por TODAS as páginas da área do comerciante
// (inicio_comerciante.html, chat_comerciante.html, marketing_comerciante.html,
// perfil_comerciante.html, cadastro-loja.html e produto-novo.html).
//
// Cada uma dessas páginas carrega este arquivo ANTES do seu
// próprio script (<script src="js/comerciante-guard.js"> vem primeiro
// no HTML). Ele decide, antes de mais nada, se quem está acessando
// pode ver a página:
//
//   1. Ninguém logado               -> volta para o login.
//   2. Logado, mas conta "cliente"  -> volta para a home (a área
//                                       do comerciante é restrita a
//                                       contas de comerciante).
//   3. Logado como "comerciante"    -> pode continuar; a sessão
//                                       fica disponível em
//                                       window.comercianteSession para
//                                       o script da própria página
//                                       usar, sem precisar ler o
//                                       localStorage de novo.
//
// Observação: como não existe backend, isso é só uma checagem no
// próprio navegador — não é uma segurança real (dá para editar o
// localStorage manualmente e "burlar" essa checagem). Serve para
// a navegação normal do protótipo, não para proteger dados.
// =========================================================

window.comercianteSession = JSON.parse(
    localStorage.getItem("modaCenterSession") || "null"
);

if (!window.comercianteSession) {

    // Ninguém logado: manda para a home e já abre o formulário de login.
    window.location.href = "index.html?login=1";

} else if (window.comercianteSession.profile !== "comerciante") {

    // Logado, mas com conta de cliente: sem acesso à área do comerciante.
    window.location.href = "index.html?area=comerciante";

}
