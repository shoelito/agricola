-- =============================================================
-- Sistema de gestión de análisis de suelos - Esquema PostgreSQL
-- Basado en el MER del escenario 01, con estos ajustes:
--   * parcela.area es numérica (m²) para poder calcular la dosis.
--   * cultivo.gramos_fertilizante / cultivo.m2_base: dosis "X g por cada X m²".
--   * recomendacion.cantidad_fertilizante_g guarda el resultado del cálculo.
--   * recomendacion.id_cultivo es opcional (pendiente de definir con el equipo).
-- =============================================================

CREATE TABLE IF NOT EXISTS productor (
    id_productor    SERIAL PRIMARY KEY,
    nombre          VARCHAR(100) NOT NULL,
    apellido        VARCHAR(100) NOT NULL,
    identificacion  VARCHAR(30)  NOT NULL UNIQUE,
    telefono        VARCHAR(30),
    correo          VARCHAR(150),
    direccion       TEXT
);

CREATE TABLE IF NOT EXISTS parcela (
    id_parcela      SERIAL PRIMARY KEY,
    nombre_parcela  VARCHAR(100)  NOT NULL,
    ubicacion       VARCHAR(255),
    area            NUMERIC(12,2) NOT NULL CHECK (area > 0),   -- en m²
    coordenadas_gps VARCHAR(255),
    id_productor    INTEGER NOT NULL REFERENCES productor(id_productor) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS analisis_suelo (
    id_analisis      SERIAL PRIMARY KEY,
    fecha_analisis   DATE NOT NULL DEFAULT CURRENT_DATE,
    ph               NUMERIC(4,2) CHECK (ph BETWEEN 0 AND 14),
    materia_organica NUMERIC(5,2) CHECK (materia_organica BETWEEN 0 AND 100),  -- %
    textura          VARCHAR(50),
    humedad          NUMERIC(5,2) CHECK (humedad BETWEEN 0 AND 100),           -- %
    observaciones    TEXT,
    id_parcela       INTEGER NOT NULL REFERENCES parcela(id_parcela) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS nutriente (
    id_nutriente   SERIAL PRIMARY KEY,
    nombre         VARCHAR(50) NOT NULL UNIQUE,
    unidad_medida  VARCHAR(30)
);

CREATE TABLE IF NOT EXISTS detalle_nutriente (
    id_detalle    SERIAL PRIMARY KEY,
    valor         VARCHAR(50) NOT NULL,
    id_analisis   INTEGER NOT NULL REFERENCES analisis_suelo(id_analisis) ON DELETE CASCADE,
    id_nutriente  INTEGER NOT NULL REFERENCES nutriente(id_nutriente) ON DELETE RESTRICT,
    UNIQUE (id_analisis, id_nutriente)
);

CREATE TABLE IF NOT EXISTS cultivo (
    id_cultivo           SERIAL PRIMARY KEY,
    nombre_cultivo       VARCHAR(100) NOT NULL UNIQUE,
    requerimientos_suelo TEXT,
    ciclo_produccion     VARCHAR(100),
    gramos_fertilizante  NUMERIC(10,2) CHECK (gramos_fertilizante > 0),  -- X gramos...
    m2_base              NUMERIC(10,2) CHECK (m2_base > 0)               -- ...por cada X m²
);

CREATE TABLE IF NOT EXISTS recomendacion (
    id_recomendacion        SERIAL PRIMARY KEY,
    tipo_recomendacion      VARCHAR(50) NOT NULL,
    descripcion             TEXT NOT NULL,
    fecha                   DATE NOT NULL DEFAULT CURRENT_DATE,
    cantidad_fertilizante_g NUMERIC(14,2),
    id_analisis             INTEGER NOT NULL REFERENCES analisis_suelo(id_analisis) ON DELETE CASCADE,
    id_cultivo              INTEGER REFERENCES cultivo(id_cultivo) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_parcela_productor   ON parcela(id_productor);
CREATE INDEX IF NOT EXISTS idx_analisis_parcela    ON analisis_suelo(id_parcela, fecha_analisis);
CREATE INDEX IF NOT EXISTS idx_recomendacion_anal  ON recomendacion(id_analisis);
