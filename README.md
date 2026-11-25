# Backend – Sistema de gestión de análisis de suelos

API REST hecha con **Node.js + Express + PostgreSQL** para el proyecto
"Diseño e implementación de un sistema de información para la gestión de análisis
de suelos orientado a la agricultura de precisión".

## Requisitos

- Node.js 20 o superior
- PostgreSQL (instalado localmente, o con Docker usando `docker compose up -d`)

## Instalación

```powershell
cd backend
npm install
copy .env.example .env     # luego ajustar usuario y contraseña de PostgreSQL
npm run dev                # inicia la API en http://localhost:3000/api (se reinicia al guardar)
```

| Script | Qué hace |
|---|---|
| `npm run dev` | Inicia la API y la reinicia al guardar cambios |
| `npm start` | Inicia la API (modo normal) |
| `npm run db:init` | Crea la BD si no existe, crea las tablas que falten y carga los datos iniciales. No borra nada |
| `npm run db:reset` | **Borra todas las tablas** y las vuelve a crear con los datos iniciales |
| `npm test` | Pruebas del cálculo y de que todas las rutas estén documentadas en `openapi.yaml` |

## Documentación de la API (OpenAPI / Swagger)

Con la API encendida:

- **http://localhost:3000/api/docs**: documentación interactiva (Swagger UI). Muestra cada
  endpoint con sus campos, ejemplos y errores, y permite probarlo con **Try it out**.
- **http://localhost:3000/api/openapi.json**: la especificación en JSON, para importarla en
  Postman, Insomnia o Bruno (*Import → Link*), o para generar tipos con `openapi-typescript`.

La especificación está en [`openapi.yaml`](openapi.yaml). **Si se agrega o cambia un endpoint,
hay que actualizar ese archivo.** `npm test` falla si una ruta no está documentada o si el
archivo documenta una ruta que no existe.

## Estructura

```
backend/
├── openapi.yaml                  documentación de la API (OpenAPI 3)
├── scripts/db.js                 init / reset de la base de datos
├── src/
│   ├── server.js                 arranque del servidor
│   ├── app.js                    configuración de Express
│   ├── docs.js                   publica /api/docs y /api/openapi.json
│   ├── db/
│   │   ├── pool.js               conexión a PostgreSQL y transacciones
│   │   ├── schema.sql            tablas
│   │   └── seed.sql              nutrientes, cultivos y datos de demostración
│   ├── routes/                   definición de endpoints
│   ├── controllers/              lógica de cada endpoint
│   ├── services/                 cálculo de recomendaciones
│   ├── middlewares/errores.js    respuestas de error uniformes
│   └── utils/                    validación de datos
└── test/                         pruebas (node --test)
```

## Modelo de datos

Tablas del MER: `productor`, `parcela`, `analisis_suelo`, `nutriente`,
`detalle_nutriente`, `cultivo` y `recomendacion`.

Ajustes respecto al MER original:

- `parcela.area` es numérica y está en **m²**, porque se usa para calcular la dosis.
- `parcela.coordenadas_gps` y `detalle_nutriente.valor` son texto.
- `cultivo.gramos_fertilizante` y `cultivo.m2_base` guardan la dosis del cultivo
  ("X g por cada X m²").
- `recomendacion.cantidad_fertilizante_g` guarda el resultado del cálculo.
- `recomendacion.id_cultivo` es **opcional** (pendiente de definir con el equipo).
- Productores y técnicos se guardan por ahora en la misma tabla `productor`.

Al eliminar registros:

- Al eliminar un productor se borran también sus parcelas, análisis y recomendaciones.
- No se puede eliminar un nutriente que ya se usa en algún análisis (responde 409).
- Al eliminar un cultivo, las recomendaciones que lo usaban se conservan, pero quedan sin cultivo.

## Recomendaciones de fertilización

```
cantidad (g) = (área de la parcela en m² / m2_base) × gramos_fertilizante
```

Ejemplo: una parcela de 500 m² con una dosis de 50 g por cada 10 m² da
(500 / 10) × 50 = **2500 g (2.5 kg)**.

La dosis se toma de lo que se envíe en la petición (`gramos_fertilizante` y `m2_base`).
Si no se envía, se usa la dosis configurada en el cultivo (`id_cultivo`).

## Endpoints

Todas las rutas empiezan con `/api`. Las peticiones y respuestas van en JSON.

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/health` | Estado de la API y de la BD |
| GET / POST | `/productores` | Listar / registrar productores |
| GET / PUT / DELETE | `/productores/:id` | Ver / actualizar / eliminar un productor |
| GET | `/productores/:id/parcelas` | Parcelas de un productor |
| GET / POST | `/parcelas` | Listar (filtro opcional `?id_productor=1`) / crear |
| GET / PUT / DELETE | `/parcelas/:id` | Ver / actualizar / eliminar una parcela |
| GET | `/parcelas/:id/analisis` | **Historial** de análisis de la parcela (más reciente primero) |
| POST | `/parcelas/:id/analisis` | Registrar un análisis con sus nutrientes |
| GET | `/analisis/:id` | Análisis con nutrientes y recomendaciones |
| PUT / DELETE | `/analisis/:id` | Actualizar / eliminar un análisis |
| GET / POST | `/analisis/:id/recomendaciones` | Listar / **generar** recomendaciones |
| GET / DELETE | `/recomendaciones/:id` | Ver / eliminar una recomendación |
| GET / POST | `/nutrientes` | Catálogo de nutrientes |
| GET / PUT / DELETE | `/nutrientes/:id` | |
| GET / POST | `/cultivos` | Catálogo de cultivos (con su dosis) |
| GET / PUT / DELETE | `/cultivos/:id` | |

`PUT` es una **actualización parcial**: solo se modifican los campos que se envían.

### Ejemplos

Registrar un productor (`POST /api/productores`):

```json
{ "nombre": "Ana", "apellido": "Mora", "identificacion": "205550555",
  "telefono": "8888-1111", "correo": "ana@correo.com", "direccion": "San Carlos" }
```

Crear una parcela (`POST /api/parcelas`):

```json
{ "nombre_parcela": "Lote Sur", "ubicacion": "Finca La Esperanza",
  "area": 500, "coordenadas_gps": "10.3236, -84.4271", "id_productor": 1 }
```

Registrar un análisis (`POST /api/parcelas/1/analisis`):

```json
{
  "fecha_analisis": "2026-10-01",
  "ph": 6.1, "materia_organica": 3.2, "textura": "Franco", "humedad": 25,
  "observaciones": "Muestra tomada a 20 cm",
  "detalles": [
    { "id_nutriente": 1, "valor": "0.2" },
    { "id_nutriente": 2, "valor": "10" }
  ]
}
```

En `PUT /api/analisis/:id`, si se envía `detalles` se **reemplaza** la lista completa de nutrientes.

Generar una recomendación (`POST /api/analisis/1/recomendaciones`). Hay dos formas:

```json
{ "gramos_fertilizante": 50, "m2_base": 10 }
```

```json
{ "id_cultivo": 1, "descripcion": "Aplicar antes de la siembra" }
```

Respuesta:

```json
{
  "id_recomendacion": 1,
  "tipo_recomendacion": "Fertilización",
  "descripcion": "Aplicar 2500 g (2.5 kg) de fertilizante en la parcela \"Lote Sur\" (500 m²), a razón de 50 g por cada 10 m².",
  "fecha": "2026-11-23",
  "cantidad_fertilizante_g": 2500,
  "id_analisis": 1,
  "id_cultivo": null,
  "nombre_cultivo": null
}
```

### Errores

Todas las respuestas de error tienen la forma `{ "error": "mensaje", "detalles": [...] }`.

| Código | Cuándo |
|---|---|
| 400 | Datos inválidos o faltantes, id mal formado, JSON inválido |
| 404 | El registro no existe |
| 409 | Valor duplicado (p. ej. identificación) o registro en uso que no se puede eliminar |
| 500 | Error inesperado del servidor |
