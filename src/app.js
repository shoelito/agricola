const express = require('express');
const cors = require('cors');
const rutas = require('./routes');
const { docs } = require('./docs');
const { rutaNoEncontrada, manejadorErrores } = require('./middlewares/errores');

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ nombre: 'API - Sistema de gestión de análisis de suelos', version: '1.0.0', base: '/api', documentacion: '/api/docs' });
});

// Documentación OpenAPI: /api/docs (interactiva) y /api/openapi.json
app.use('/api', docs);

// Express 5 envía automáticamente los errores de funciones async al manejador de errores.
app.use('/api', rutas);

app.use(rutaNoEncontrada);
app.use(manejadorErrores);

module.exports = app;
