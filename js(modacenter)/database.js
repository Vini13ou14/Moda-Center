const mysql = require("mysql2/promise");

const pool = mysql.createPool({
    host: "host",
    port: 3306,
    user: "seu_usuário",
    password: "sua_senha",
    database: "modaCenterUsers",

    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});
  
module.exports = pool;

//& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p
//mysql -u root -p
//Get-ChildItem
//cd ".\js(modacenter)"
//cd "C:\Users\Admin\Downloads\moda center\js(modacenter)"
// node -e "const pool=require('./database'); pool.query('SELECT 1').then(()=>{console.log('✅ MySQL conectado com sucesso!'); process.exit();}).catch(err=>{console.error('❌ Erro:',err.message); process.exit(1);});"