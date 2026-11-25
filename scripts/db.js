/**
 * Utilidades de base de datos.
 *   node scripts/db.js init   -> crea la BD si no existe, las tablas y los datos iniciales
 *   node scripts/db.js reset  -> BORRA todas las tablas y las vuelve a crear con los datos iniciales
 */
const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('pg');
const { configuracion } = require('../src/db/pool');

const DIR_SQL = path.join(__dirname, '..', 'src', 'db');
const leerSql = (archivo) => fs.readFileSync(path.join(DIR_SQL, archivo), 'utf8');

const DROP_SQL = `
  DROP TABLE IF EXISTS recomendacion, detalle_nutriente, analisis_suelo,
                       parcela, productor, nutriente, cultivo CASCADE;
`;

async function crearBaseSiNoExiste() {
  const { database } = configuracion();
  const admin = new Client(configuracion('postgres'));
  await admin.connect();
  try {
    const { rowCount } = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [database]);
    if (rowCount === 0) {
      await admin.query(`CREATE DATABASE ${admin.escapeIdentifier(database)}`);
      console.log(`Base de datos "${database}" creada.`);
    }
  } finally {
    await admin.end();
  }
}

async function main() {
  const comando = process.argv[2];
  if (!['init', 'reset'].includes(comando)) {
    console.error('Uso: node scripts/db.js <init|reset>');
    process.exit(1);
  }

  await crearBaseSiNoExiste();

  const client = new Client(configuracion());
  await client.connect();
  try {
    if (comando === 'reset') {
      await client.query(DROP_SQL);
      console.log('Tablas eliminadas.');
    }
    await client.query(leerSql('schema.sql'));
    console.log('Tablas creadas.');
    await client.query(leerSql('seed.sql'));
    console.log('Datos iniciales cargados.');
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});
