const { pool } = require('../db/pool');
const { HttpError } = require('../utils/httpError');
const { validar, parsearId } = require('../utils/validar');
const { calcularFertilizante, generarDescripcion } = require('../services/recomendaciones.service');

const esquemaRecomendacion = {
  id_cultivo:          { tipo: 'entero' },                 // opcional
  gramos_fertilizante: { tipo: 'numero', min: 0.01 },     // si no se envía, se usa la del cultivo
  m2_base:             { tipo: 'numero', min: 0.01 },     // si no se envía, se usa la del cultivo
  tipo_recomendacion:  { tipo: 'texto', max: 50 },
  descripcion:         { tipo: 'texto' },                  // nota adicional opcional
};

const SELECT_RECOMENDACION = `
  SELECT r.*, c.nombre_cultivo
  FROM recomendacion r
  LEFT JOIN cultivo c ON c.id_cultivo = r.id_cultivo
`;

/**
 * POST /analisis/:id/recomendaciones
 *
 * Calcula la cantidad de fertilizante según el área de la parcela del análisis
 * y la guarda como recomendación. La dosis se toma, en este orden:
 *   1. de gramos_fertilizante / m2_base enviados en el cuerpo, o
 *   2. de la dosis configurada en el cultivo (id_cultivo).
 */
async function generar(req, res) {
  const idAnalisis = parsearId(req.params.id);
  const datos = validar(req.body ?? {}, esquemaRecomendacion);

  const { rows: [analisis] } = await pool.query(
    `SELECT a.id_analisis, p.nombre_parcela, p.area
     FROM analisis_suelo a
     JOIN parcela p ON p.id_parcela = a.id_parcela
     WHERE a.id_analisis = $1`,
    [idAnalisis],
  );
  if (!analisis) throw new HttpError(404, 'Análisis no encontrado');

  let cultivo = null;
  if (datos.id_cultivo) {
    const { rows } = await pool.query('SELECT * FROM cultivo WHERE id_cultivo = $1', [datos.id_cultivo]);
    if (rows.length === 0) throw new HttpError(404, 'Cultivo no encontrado');
    cultivo = rows[0];
  }

  const gramos = datos.gramos_fertilizante ?? cultivo?.gramos_fertilizante;
  const m2Base = datos.m2_base ?? cultivo?.m2_base;
  if (gramos == null || m2Base == null) {
    throw new HttpError(
      400,
      'No hay dosis para calcular: envíe gramos_fertilizante y m2_base, o un id_cultivo que tenga la dosis configurada',
    );
  }

  const cantidad = calcularFertilizante({ area: analisis.area, gramos, m2Base });
  let descripcion = generarDescripcion({
    cantidad,
    area: analisis.area,
    gramos,
    m2Base,
    nombreParcela: analisis.nombre_parcela,
    nombreCultivo: cultivo?.nombre_cultivo,
  });
  if (datos.descripcion) descripcion += `\nNota: ${datos.descripcion}`;

  const { rows: [nueva] } = await pool.query(
    `INSERT INTO recomendacion (tipo_recomendacion, descripcion, cantidad_fertilizante_g, id_analisis, id_cultivo)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id_recomendacion`,
    [datos.tipo_recomendacion ?? 'Fertilización', descripcion, cantidad, idAnalisis, cultivo?.id_cultivo ?? null],
  );

  const { rows } = await pool.query(`${SELECT_RECOMENDACION} WHERE r.id_recomendacion = $1`, [nueva.id_recomendacion]);
  res.status(201).json(rows[0]);
}

/** GET /analisis/:id/recomendaciones */
async function listarPorAnalisis(req, res) {
  const idAnalisis = parsearId(req.params.id);
  const existe = await pool.query('SELECT 1 FROM analisis_suelo WHERE id_analisis = $1', [idAnalisis]);
  if (existe.rowCount === 0) throw new HttpError(404, 'Análisis no encontrado');

  const { rows } = await pool.query(
    `${SELECT_RECOMENDACION} WHERE r.id_analisis = $1 ORDER BY r.fecha DESC, r.id_recomendacion DESC`,
    [idAnalisis],
  );
  res.json(rows);
}

/** GET /recomendaciones/:id */
async function obtener(req, res) {
  const { rows } = await pool.query(`${SELECT_RECOMENDACION} WHERE r.id_recomendacion = $1`, [parsearId(req.params.id)]);
  if (rows.length === 0) throw new HttpError(404, 'Recomendación no encontrada');
  res.json(rows[0]);
}

/** DELETE /recomendaciones/:id */
async function eliminar(req, res) {
  const { rowCount } = await pool.query('DELETE FROM recomendacion WHERE id_recomendacion = $1', [parsearId(req.params.id)]);
  if (rowCount === 0) throw new HttpError(404, 'Recomendación no encontrada');
  res.status(204).end();
}

module.exports = { generar, listarPorAnalisis, obtener, eliminar };
