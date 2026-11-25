const { test } = require('node:test');
const assert = require('node:assert/strict');
const rutas = require('../src/routes');
const { especificacion } = require('../src/docs');

/** Recorre el router de /api y devuelve ['GET /productores/{id}', ...] */
function rutasDeExpress(router) {
  const encontradas = [];
  for (const capa of router.stack) {
    if (capa.route) {
      const ruta = capa.route.path.replace(/:(\w+)/g, '{$1}');
      for (const metodo of Object.keys(capa.route.methods)) encontradas.push(`${metodo.toUpperCase()} ${ruta}`);
    } else if (capa.handle?.stack) {
      encontradas.push(...rutasDeExpress(capa.handle));
    }
  }
  return encontradas;
}

function rutasDeOpenApi(spec) {
  const metodos = ['get', 'post', 'put', 'patch', 'delete'];
  return Object.entries(spec.paths).flatMap(([ruta, item]) =>
    Object.keys(item).filter((k) => metodos.includes(k)).map((m) => `${m.toUpperCase()} ${ruta}`));
}

test('cada ruta de la API está documentada en openapi.yaml', () => {
  const documentadas = new Set(rutasDeOpenApi(especificacion));
  const faltantes = rutasDeExpress(rutas).filter((r) => !documentadas.has(r));
  assert.deepEqual(faltantes, [], `Rutas sin documentar: ${faltantes.join(', ')}`);
});

test('openapi.yaml no documenta rutas que no existen', () => {
  const reales = new Set(rutasDeExpress(rutas));
  const sobrantes = rutasDeOpenApi(especificacion).filter((r) => !reales.has(r));
  assert.deepEqual(sobrantes, [], `Rutas documentadas que no existen: ${sobrantes.join(', ')}`);
});
