const { HttpError } = require('../utils/httpError');

function rutaNoEncontrada(req, res) {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
}

// Express reconoce el manejador de errores porque recibe 4 parámetros.
// eslint-disable-next-line no-unused-vars
function manejadorErrores(err, req, res, next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, ...(err.detalles && { detalles: err.detalles }) });
  }

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'El cuerpo de la petición no es un JSON válido' });
  }

  // Errores de PostgreSQL más comunes
  switch (err.code) {
    case '23505':
      return res.status(409).json({ error: 'Ya existe un registro con ese valor', detalle: err.detail });
    case '23001': // restrict_violation (FK con ON DELETE RESTRICT)
    case '23503': // foreign_key_violation
      return req.method === 'DELETE'
        ? res.status(409).json({ error: 'No se puede eliminar: hay registros que dependen de este', detalle: err.detail })
        : res.status(400).json({ error: 'Se hace referencia a un registro que no existe', detalle: err.detail });
    case '23514':
      return res.status(400).json({ error: 'Un valor no cumple las restricciones permitidas', detalle: err.constraint });
    case '22P02':
    case '22003':
    case '22007':
    case '22008':
      return res.status(400).json({ error: 'Un valor tiene un formato inválido' });
    case 'ECONNREFUSED':
      console.error('No se pudo conectar a PostgreSQL:', err.message);
      return res.status(503).json({ error: 'La base de datos no está disponible' });
    default:
      console.error(err);
      return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

module.exports = { rutaNoEncontrada, manejadorErrores };
