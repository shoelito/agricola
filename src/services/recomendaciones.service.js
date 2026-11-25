/**
 * Lógica de recomendaciones de fertilización.
 *
 * Regla: se aplican `gramos` de fertilizante por cada `m2Base` m² de parcela.
 *   cantidad (g) = (área / m2Base) × gramos
 *
 * Ejemplo: parcela de 500 m², dosis 50 g por cada 10 m²  ->  (500 / 10) × 50 = 2500 g
 */

function redondear(numero, decimales = 2) {
  const factor = 10 ** decimales;
  return Math.round(numero * factor) / factor;
}

function calcularFertilizante({ area, gramos, m2Base }) {
  for (const [nombre, valor] of Object.entries({ area, gramos, m2Base })) {
    if (!Number.isFinite(valor) || valor <= 0) {
      throw new RangeError(`${nombre} debe ser un número mayor que 0`);
    }
  }
  return redondear((area / m2Base) * gramos);
}

/** 2500 -> "2500 g (2.5 kg)" ; 350 -> "350 g" */
function formatearGramos(gramos) {
  return gramos >= 1000 ? `${gramos} g (${redondear(gramos / 1000)} kg)` : `${gramos} g`;
}

function generarDescripcion({ cantidad, area, gramos, m2Base, nombreParcela, nombreCultivo }) {
  const cultivo = nombreCultivo ? ` para el cultivo de ${nombreCultivo}` : '';
  return `Aplicar ${formatearGramos(cantidad)} de fertilizante en la parcela "${nombreParcela}" `
    + `(${area} m²)${cultivo}, a razón de ${gramos} g por cada ${m2Base} m².`;
}

module.exports = { calcularFertilizante, formatearGramos, generarDescripcion };
