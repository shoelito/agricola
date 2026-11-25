const { pool } = require('../db/pool');
const { HttpError } = require('../utils/httpError');
const { validar, parsearId } = require('../utils/validar');

/**
 * Genera los 5 controladores CRUD (listar, obtener, crear, actualizar, eliminar)
 * para una tabla sencilla.
 *
 * @param {object} config
 * @param {string} config.tabla      nombre de la tabla
 * @param {string} config.id         nombre de la llave primaria
 * @param {string} config.entidad    nombre legible para los mensajes ("Productor")
 * @param {object} config.esquema    campos editables y sus reglas (ver utils/validar.js)
 * @param {string} [config.orden]    ORDER BY para listar
 * @param {string[]} [config.filtros] columnas (ids) que se pueden filtrar por query string
 *
 * Los nombres de tabla y columna vienen de este código, nunca del cliente,
 * y los valores siempre van como parámetros ($1, $2...).
 */
function crearCrud({ tabla, id, entidad, esquema, orden = id, filtros = [] }) {
  const noEncontrado = () => new HttpError(404, `${entidad} no encontrado`);

  async function listar(req, res) {
    const condiciones = [];
    const valores = [];
    for (const filtro of filtros) {
      if (req.query[filtro] !== undefined) {
        valores.push(parsearId(req.query[filtro], filtro));
        condiciones.push(`${filtro} = $${valores.length}`);
      }
    }
    const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
    const { rows } = await pool.query(`SELECT * FROM ${tabla} ${where} ORDER BY ${orden}`, valores);
    res.json(rows);
  }

  async function obtener(req, res) {
    const { rows } = await pool.query(`SELECT * FROM ${tabla} WHERE ${id} = $1`, [parsearId(req.params.id)]);
    if (rows.length === 0) throw noEncontrado();
    res.json(rows[0]);
  }

  async function crear(req, res) {
    const datos = validar(req.body, esquema);
    const columnas = Object.keys(datos);
    const marcadores = columnas.map((_, i) => `$${i + 1}`);
    const { rows } = await pool.query(
      `INSERT INTO ${tabla} (${columnas.join(', ')}) VALUES (${marcadores.join(', ')}) RETURNING *`,
      Object.values(datos),
    );
    res.status(201).json(rows[0]);
  }

  /** Actualización parcial: solo se modifican los campos enviados. */
  async function actualizar(req, res) {
    const idRegistro = parsearId(req.params.id);
    const datos = validar(req.body, esquema, { parcial: true });
    const columnas = Object.keys(datos);
    if (columnas.length === 0) throw new HttpError(400, 'No se envió ningún campo para actualizar');

    const asignaciones = columnas.map((columna, i) => `${columna} = $${i + 1}`);
    const { rows } = await pool.query(
      `UPDATE ${tabla} SET ${asignaciones.join(', ')} WHERE ${id} = $${columnas.length + 1} RETURNING *`,
      [...Object.values(datos), idRegistro],
    );
    if (rows.length === 0) throw noEncontrado();
    res.json(rows[0]);
  }

  async function eliminar(req, res) {
    const { rowCount } = await pool.query(`DELETE FROM ${tabla} WHERE ${id} = $1`, [parsearId(req.params.id)]);
    if (rowCount === 0) throw noEncontrado();
    res.status(204).end();
  }

  return { listar, obtener, crear, actualizar, eliminar };
}

module.exports = { crearCrud };
