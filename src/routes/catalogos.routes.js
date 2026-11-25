const { Router } = require('express');
const { crearCrud } = require('../controllers/crudFactory');

const nutrientes = crearCrud({
  tabla: 'nutriente',
  id: 'id_nutriente',
  entidad: 'Nutriente',
  orden: 'nombre',
  esquema: {
    nombre:        { tipo: 'texto', requerido: true, max: 50 },
    unidad_medida: { tipo: 'texto', max: 30 },
  },
});

const cultivos = crearCrud({
  tabla: 'cultivo',
  id: 'id_cultivo',
  entidad: 'Cultivo',
  orden: 'nombre_cultivo',
  esquema: {
    nombre_cultivo:       { tipo: 'texto', requerido: true, max: 100 },
    requerimientos_suelo: { tipo: 'texto' },
    ciclo_produccion:     { tipo: 'texto', max: 100 },
    // Dosis de fertilizante: "gramos_fertilizante g por cada m2_base m²"
    gramos_fertilizante:  { tipo: 'numero', min: 0.01 },
    m2_base:              { tipo: 'numero', min: 0.01 },
  },
});

const router = Router();

router.get('/nutrientes', nutrientes.listar);
router.post('/nutrientes', nutrientes.crear);
router.get('/nutrientes/:id', nutrientes.obtener);
router.put('/nutrientes/:id', nutrientes.actualizar);
router.delete('/nutrientes/:id', nutrientes.eliminar);

router.get('/cultivos', cultivos.listar);
router.post('/cultivos', cultivos.crear);
router.get('/cultivos/:id', cultivos.obtener);
router.put('/cultivos/:id', cultivos.actualizar);
router.delete('/cultivos/:id', cultivos.eliminar);

module.exports = router;
