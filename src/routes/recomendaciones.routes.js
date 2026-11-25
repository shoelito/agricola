const { Router } = require('express');
const recomendaciones = require('../controllers/recomendaciones.controller');

const router = Router();
router.post('/analisis/:id/recomendaciones', recomendaciones.generar);
router.get('/analisis/:id/recomendaciones', recomendaciones.listarPorAnalisis);
router.get('/recomendaciones/:id', recomendaciones.obtener);
router.delete('/recomendaciones/:id', recomendaciones.eliminar);

module.exports = router;
