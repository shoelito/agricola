const { Router } = require('express');
const { pool } = require('../db/pool');
const { crearCrud } = require('../controllers/crudFactory');
const { HttpError } = require('../utils/httpError');
const { parsearId } = require('../utils/validar');

const crud = crearCrud({
  tabla: 'productor',
  id: 'id_productor',
  entidad: 'Productor',
  orden: 'apellido, nombre',
  esquema: {
    nombre:         { tipo: 'texto', requerido: true, max: 100 },
    apellido:       { tipo: 'texto', requerido: true, max: 100 },
    identificacion: { tipo: 'texto', requerido: true, max: 30 },
    telefono:       { tipo: 'texto', max: 30 },
    correo:         { tipo: 'texto', max: 150 },
    direccion:      { tipo: 'texto' },
  },
});

/** GET /productores/:id/parcelas */
async function listarParcelas(req, res) {
  const idProductor = parsearId(req.params.id);
  const existe = await pool.query('SELECT 1 FROM productor WHERE id_productor = $1', [idProductor]);
  if (existe.rowCount === 0) throw new HttpError(404, 'Productor no encontrado');

  const { rows } = await pool.query(
    'SELECT * FROM parcela WHERE id_productor = $1 ORDER BY nombre_parcela',
    [idProductor],
  );
  res.json(rows);
}

const router = Router();
router.get('/productores', crud.listar);
router.post('/productores', crud.crear);
router.get('/productores/:id', crud.obtener);
router.put('/productores/:id', crud.actualizar);
router.delete('/productores/:id', crud.eliminar);
router.get('/productores/:id/parcelas', listarParcelas);

module.exports = router;
