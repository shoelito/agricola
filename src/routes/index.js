const { Router } = require('express');
const { pool } = require('../db/pool');

const router = Router();

/** GET /api/health — verifica que la API y la base de datos respondan. */
router.get('/health', async (req, res) => {
  await pool.query('SELECT 1');
  res.json({ estado: 'ok', baseDeDatos: 'conectada' });
});

router.use(require('./productores.routes'));
router.use(require('./parcelas.routes'));
router.use(require('./catalogos.routes'));
router.use(require('./analisis.routes'));
router.use(require('./recomendaciones.routes'));

module.exports = router;
