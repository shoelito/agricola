const { Router } = require('express');
const { crearCrud } = require('../controllers/crudFactory');

const crud = crearCrud({
  tabla: 'parcela',
  id: 'id_parcela',
  entidad: 'Parcela',
  orden: 'nombre_parcela',
  filtros: ['id_productor'], // GET /parcelas?id_productor=1
  esquema: {
    nombre_parcela:  { tipo: 'texto', requerido: true, max: 100 },
    ubicacion:       { tipo: 'texto', max: 255 },
    area:            { tipo: 'numero', requerido: true, min: 0.01 }, // m²
    coordenadas_gps: { tipo: 'texto', max: 255 },
    id_productor:    { tipo: 'entero', requerido: true },
  },
});

const router = Router();
router.get('/parcelas', crud.listar);
router.post('/parcelas', crud.crear);
router.get('/parcelas/:id', crud.obtener);
router.put('/parcelas/:id', crud.actualizar);
router.delete('/parcelas/:id', crud.eliminar);

module.exports = router;
