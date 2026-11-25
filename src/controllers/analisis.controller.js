const { pool, transaccion } = require('../db/pool');
const { HttpError } = require('../utils/httpError');
const { validar, parsearId } = require('../utils/validar');

const esquemaAnalisis = {
  fecha_analisis:   { tipo: 'fecha' },                           // por defecto: hoy
  ph:               { tipo: 'numero', min: 0, maxValor: 14 },
  materia_organica: { tipo: 'numero', min: 0, maxValor: 100 },   // %
  textura:          { tipo: 'texto', max: 50 },
  humedad:          { tipo: 'numero', min: 0, maxValor: 100 },   // %
  observaciones:    { tipo: 'texto' },
};

const esquemaDetalle = {
  id_nutriente: { tipo: 'entero', requerido: true },
  valor:        { tipo: 'texto', requerido: true, max: 50 },
};

/** Consulta base: cada análisis con su lista de nutrientes en el campo `detalles`. */
const SELECT_ANALISIS = `
  SELECT a.*,
         COALESCE(
           json_agg(
             json_build_object(
               'id_detalle',    d.id_detalle,
               'id_nutriente',  n.id_nutriente,
               'nutriente',     n.nombre,
               'unidad_medida', n.unidad_medida,
               'valor',         d.valor
             ) ORDER BY n.nombre
           ) FILTER (WHERE d.id_detalle IS NOT NULL),
           '[]'
         ) AS detalles
  FROM analisis_suelo a
  LEFT JOIN detalle_nutriente d ON d.id_analisis = a.id_analisis
  LEFT JOIN nutriente n         ON n.id_nutriente = d.id_nutriente
`;

function validarDetalles(detalles) {
  if (!Array.isArray(detalles)) throw new HttpError(400, 'detalles debe ser una lista');
  const validados = detalles.map((detalle, i) => {
    try {
      return validar(detalle, esquemaDetalle);
    } catch (error) {
      if (error instanceof HttpError) {
        throw new HttpError(400, `Detalle #${i + 1} inválido`, error.detalles ?? [error.message]);
      }
      throw error;
    }
  });
  const ids = validados.map((d) => d.id_nutriente);
  if (new Set(ids).size !== ids.length) throw new HttpError(400, 'Un nutriente aparece más de una vez en detalles');
  return validados;
}

async function insertarDetalles(client, idAnalisis, detalles) {
  for (const { id_nutriente, valor } of detalles) {
    await client.query(
      'INSERT INTO detalle_nutriente (valor, id_analisis, id_nutriente) VALUES ($1, $2, $3)',
      [valor, idAnalisis, id_nutriente],
    );
  }
}

async function buscarAnalisis(idAnalisis, db = pool) {
  const { rows } = await db.query(`${SELECT_ANALISIS} WHERE a.id_analisis = $1 GROUP BY a.id_analisis`, [idAnalisis]);
  return rows[0] ?? null;
}

async function verificarParcela(idParcela) {
  const { rowCount } = await pool.query('SELECT 1 FROM parcela WHERE id_parcela = $1', [idParcela]);
  if (rowCount === 0) throw new HttpError(404, 'Parcela no encontrada');
}

/** GET /parcelas/:id/analisis — historial de la parcela, del más reciente al más antiguo. */
async function historialParcela(req, res) {
  const idParcela = parsearId(req.params.id);
  await verificarParcela(idParcela);
  const { rows } = await pool.query(
    `${SELECT_ANALISIS}
     WHERE a.id_parcela = $1
     GROUP BY a.id_analisis
     ORDER BY a.fecha_analisis DESC, a.id_analisis DESC`,
    [idParcela],
  );
  res.json(rows);
}

/** POST /parcelas/:id/analisis — registra un análisis con sus nutrientes. */
async function crear(req, res) {
  const idParcela = parsearId(req.params.id);
  const datos = validar(req.body, esquemaAnalisis);
  const detalles = validarDetalles(req.body.detalles ?? []);
  await verificarParcela(idParcela);

  const analisis = await transaccion(async (client) => {
    const columnas = [...Object.keys(datos), 'id_parcela'];
    const valores = [...Object.values(datos), idParcela];
    const marcadores = columnas.map((_, i) => `$${i + 1}`);
    const { rows } = await client.query(
      `INSERT INTO analisis_suelo (${columnas.join(', ')}) VALUES (${marcadores.join(', ')}) RETURNING id_analisis`,
      valores,
    );
    await insertarDetalles(client, rows[0].id_analisis, detalles);
    return buscarAnalisis(rows[0].id_analisis, client);
  });

  res.status(201).json(analisis);
}

/** GET /analisis/:id — análisis con nutrientes y recomendaciones. */
async function obtener(req, res) {
  const idAnalisis = parsearId(req.params.id);
  const analisis = await buscarAnalisis(idAnalisis);
  if (!analisis) throw new HttpError(404, 'Análisis no encontrado');

  const { rows: recomendaciones } = await pool.query(
    `SELECT r.*, c.nombre_cultivo
     FROM recomendacion r
     LEFT JOIN cultivo c ON c.id_cultivo = r.id_cultivo
     WHERE r.id_analisis = $1
     ORDER BY r.fecha DESC, r.id_recomendacion DESC`,
    [idAnalisis],
  );
  res.json({ ...analisis, recomendaciones });
}

/**
 * PUT /analisis/:id — actualización parcial.
 * Si se envía `detalles`, reemplaza por completo la lista de nutrientes.
 */
async function actualizar(req, res) {
  const idAnalisis = parsearId(req.params.id);
  const datos = validar(req.body, esquemaAnalisis, { parcial: true });
  const detalles = req.body.detalles === undefined ? undefined : validarDetalles(req.body.detalles);
  const columnas = Object.keys(datos);
  if (columnas.length === 0 && detalles === undefined) {
    throw new HttpError(400, 'No se envió ningún campo para actualizar');
  }

  const analisis = await transaccion(async (client) => {
    const existe = await client.query('SELECT 1 FROM analisis_suelo WHERE id_analisis = $1 FOR UPDATE', [idAnalisis]);
    if (existe.rowCount === 0) throw new HttpError(404, 'Análisis no encontrado');

    if (columnas.length > 0) {
      const asignaciones = columnas.map((columna, i) => `${columna} = $${i + 1}`);
      await client.query(
        `UPDATE analisis_suelo SET ${asignaciones.join(', ')} WHERE id_analisis = $${columnas.length + 1}`,
        [...Object.values(datos), idAnalisis],
      );
    }
    if (detalles !== undefined) {
      await client.query('DELETE FROM detalle_nutriente WHERE id_analisis = $1', [idAnalisis]);
      await insertarDetalles(client, idAnalisis, detalles);
    }
    return buscarAnalisis(idAnalisis, client);
  });

  res.json(analisis);
}

/** DELETE /analisis/:id — borra también sus detalles y recomendaciones. */
async function eliminar(req, res) {
  const { rowCount } = await pool.query('DELETE FROM analisis_suelo WHERE id_analisis = $1', [parsearId(req.params.id)]);
  if (rowCount === 0) throw new HttpError(404, 'Análisis no encontrado');
  res.status(204).end();
}

module.exports = { historialParcela, crear, obtener, actualizar, eliminar };
