# Moda-Center

## Servidor da v3

A versão `v3` possui uma API HTTP em `server.js`. O catálogo do cliente consulta os produtos centralizados em `/api/catalog`, e novos produtos são enviados para `/api/products` quando o site está hospedado. O `localStorage` permanece apenas como fallback para demonstração offline.

Para executar localmente com Node.js 20 ou superior:

```bash
npm start
```

Depois, abra `http://localhost:3000/`.

Para manter o processo ativo em produção, use um gerenciador como PM2, configure um proxy HTTPS (Nginx ou equivalente), faça backups de `server/data.json` e monitore `/api/health`. Para múltiplos servidores ou alto volume, substitua o arquivo JSON por PostgreSQL/MySQL e use armazenamento de imagens próprio.