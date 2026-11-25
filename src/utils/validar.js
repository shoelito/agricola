const { HttpError } = require('./httpError');

/**
 * Valida y normaliza el cuerpo de una petición según un esquema.
 *
 * Esquema: { campo: { tipo, requerido, max, min, maxValor } }
 *   tipo: 'texto' | 'numero' | 'entero' | 'fecha'
 *   max:      largo máximo (texto)
 *   min/maxValor: rango permitido (numero)
 *
 * Con { parcial: true } (actualizaciones) no se exigen los campos requeridos,
 * solo se validan los que vengan.
 *
 * Devuelve un objeto que contiene únicamente los campos del esquema.
 */
function validar(body, esquema, { parcial = false } = {}) {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw new HttpError(400, 'El cuerpo de la petición debe ser un objeto JSON');
  }

  const datos = {};
  const errores = [];

  for (const [campo, reglas] of Object.entries(esquema)) {
    let valor = body[campo];
    if (typeof valor === 'string') valor = valor.trim();

    if (valor === undefined) {
      if (reglas.requerido && !parcial) errores.push(`${campo} es obligatorio`);
      continue;
    }
    if (valor === null || valor === '') {
      if (reglas.requerido) errores.push(`${campo} es obligatorio`);
      else datos[campo] = null;
      continue;
    }

    const error = validarValor(campo, valor, reglas);
    if (error) errores.push(error);
    else datos[campo] = reglas.tipo === 'numero' || reglas.tipo === 'entero' ? Number(valor) : String(valor);
  }

  if (errores.length > 0) throw new HttpError(400, 'Datos inválidos', errores);
  return datos;
}

function validarValor(campo, valor, reglas) {
  switch (reglas.tipo) {
    case 'texto':
      if (typeof valor !== 'string' && typeof valor !== 'number') return `${campo} debe ser texto`;
      if (reglas.max && String(valor).length > reglas.max) return `${campo} admite máximo ${reglas.max} caracteres`;
      return null;

    case 'numero': {
      const n = Number(valor);
      if (typeof valor === 'boolean' || !Number.isFinite(n)) return `${campo} debe ser un número`;
      if (reglas.min !== undefined && n < reglas.min) return `${campo} debe ser mayor o igual a ${reglas.min}`;
      if (reglas.maxValor !== undefined && n > reglas.maxValor) return `${campo} debe ser menor o igual a ${reglas.maxValor}`;
      return null;
    }

    case 'entero': {
      const n = Number(valor);
      if (typeof valor === 'boolean' || !Number.isInteger(n) || n <= 0) return `${campo} debe ser un entero positivo`;
      return null;
    }

    case 'fecha': {
      const fecha = typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor)
        ? new Date(`${valor}T00:00:00Z`)
        : null;
      // Descarta fechas imposibles como 2026-02-30 (Date las "corre" al mes siguiente)
      const valida = fecha && !Number.isNaN(fecha.getTime()) && fecha.toISOString().startsWith(valor);
      return valida ? null : `${campo} debe ser una fecha válida con formato AAAA-MM-DD`;
    }

    default:
      return `${campo}: tipo de validación desconocido`;
  }
}

/** Convierte un parámetro de ruta (/:id) a entero positivo o responde 400. */
function parsearId(valor, nombre = 'id') {
  const n = Number(valor);
  if (!Number.isInteger(n) || n <= 0) throw new HttpError(400, `${nombre} debe ser un entero positivo`);
  return n;
}

module.exports = { validar, parsearId };
