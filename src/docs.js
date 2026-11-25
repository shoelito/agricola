const fs = require('node:fs');
const path = require('node:path');
const { Router } = require('express');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yaml');

/** Especificación OpenAPI (openapi.yaml en la raíz del backend). */
const especificacion = YAML.parse(fs.readFileSync(path.join(__dirname, '..', 'openapi.yaml'), 'utf8'));

const router = Router();

// JSON crudo: para importar en Postman, Insomnia, Bruno o generar tipos.
router.get('/openapi.json', (req, res) => res.json(especificacion));

// Documentación interactiva: http://localhost:3000/api/docs
router.use('/docs', swaggerUi.serve, swaggerUi.setup(especificacion, {
  customSiteTitle: 'API - Análisis de suelos',
  swaggerOptions: { docExpansion: 'none', tryItOutEnabled: true },
}));

module.exports = { docs: router, especificacion };
