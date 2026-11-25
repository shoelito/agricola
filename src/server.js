const { pool } = require('./db/pool'); // carga también las variables de .env
const app = require('./app');

const PORT = Number(process.env.PORT) || 3000;

const server = app.listen(PORT, () => {
  console.log(`API escuchando en http://localhost:${PORT}/api`);
});

function cerrar() {
  server.close(() => pool.end().then(() => process.exit(0)));
}
process.on('SIGINT', cerrar);
process.on('SIGTERM', cerrar);
