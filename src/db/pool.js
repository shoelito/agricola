require('dotenv').config({ quiet: true });
const { Pool, types } = require('pg');

// NUMERIC llega como texto por defecto; lo convertimos a número para que el
// frontend pueda graficarlo directamente.
types.setTypeParser(types.builtins.NUMERIC, (valor) => (valor === null ? null : parseFloat(valor)));
// DATE se devuelve tal cual ('2026-11-23') para evitar corrimientos por zona horaria.
types.setTypeParser(types.builtins.DATE, (valor) => valor);

function configuracion(database = process.env.DB_NAME || 'agricola') {
  return {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database,
  };
}

const pool = new Pool(configuracion());

/**
 * Ejecuta `fn(client)` dentro de una transacción.
 * Si algo falla se hace ROLLBACK y se relanza el error.
 */
async function transaccion(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const resultado = await fn(client);
    await client.query('COMMIT');
    return resultado;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { pool, transaccion, configuracion };
