const { test } = require('node:test');
const assert = require('node:assert/strict');
const { calcularFertilizante, formatearGramos, generarDescripcion } = require('../src/services/recomendaciones.service');

test('calcula los gramos según el área: 500 m² a 50 g cada 10 m² = 2500 g', () => {
  assert.equal(calcularFertilizante({ area: 500, gramos: 50, m2Base: 10 }), 2500);
});

test('redondea a 2 decimales', () => {
  assert.equal(calcularFertilizante({ area: 100, gramos: 10, m2Base: 3 }), 333.33);
});

test('rechaza valores en cero, negativos o no numéricos', () => {
  assert.throws(() => calcularFertilizante({ area: 0, gramos: 50, m2Base: 10 }), RangeError);
  assert.throws(() => calcularFertilizante({ area: 500, gramos: -1, m2Base: 10 }), RangeError);
  assert.throws(() => calcularFertilizante({ area: 500, gramos: 50, m2Base: undefined }), RangeError);
});

test('formatea en kg a partir de 1000 g', () => {
  assert.equal(formatearGramos(350), '350 g');
  assert.equal(formatearGramos(2500), '2500 g (2.5 kg)');
});

test('la descripción incluye la parcela, la dosis y el cultivo', () => {
  const texto = generarDescripcion({
    cantidad: 2500, area: 500, gramos: 50, m2Base: 10, nombreParcela: 'Lote Norte', nombreCultivo: 'Maíz',
  });
  assert.match(texto, /2500 g \(2\.5 kg\)/);
  assert.match(texto, /Lote Norte/);
  assert.match(texto, /Maíz/);
  assert.match(texto, /50 g por cada 10 m²/);
});
