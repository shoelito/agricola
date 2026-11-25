const { Router } = require('express');
const analisis = require('../controllers/analisis.controller');

const router = Router();
router.get('/parcelas/:id/analisis', analisis.historialParcela);
router.post('/parcelas/:id/analisis', analisis.crear);
router.get('/analisis/:id', analisis.obtener);
router.put('/analisis/:id', analisis.actualizar);
router.delete('/analisis/:id', analisis.eliminar);

module.exports = router;
