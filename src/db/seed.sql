-- =============================================================
-- Datos iniciales. Se puede ejecutar varias veces sin duplicar.
-- Las dosis de los cultivos son valores de ejemplo: ajustarlas con el equipo.
-- =============================================================

INSERT INTO nutriente (nombre, unidad_medida) VALUES
    ('Nitrógeno (N)',  '%'),
    ('Fósforo (P)',    'mg/L'),
    ('Potasio (K)',    'cmol(+)/L'),
    ('Calcio (Ca)',    'cmol(+)/L'),
    ('Magnesio (Mg)',  'cmol(+)/L'),
    ('Azufre (S)',     'mg/L'),
    ('Hierro (Fe)',    'mg/L'),
    ('Zinc (Zn)',      'mg/L')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO cultivo (nombre_cultivo, requerimientos_suelo, ciclo_produccion, gramos_fertilizante, m2_base) VALUES
    ('Maíz',   'pH 5.5 - 7.0, suelos francos y bien drenados',          '120 días',   35, 1),
    ('Frijol', 'pH 6.0 - 7.0, suelos sueltos con buena materia orgánica', '90 días',    20, 1),
    ('Tomate', 'pH 6.0 - 6.8, suelos profundos y bien drenados',          '110 días',   60, 1),
    ('Papa',   'pH 5.0 - 6.5, suelos sueltos y fértiles',                 '120 días',   80, 1),
    ('Arroz',  'pH 5.5 - 6.5, suelos arcillosos que retengan agua',       '130 días',   30, 1),
    ('Café',   'pH 5.0 - 6.0, suelos profundos ricos en materia orgánica', 'Perenne',  100, 4)
ON CONFLICT (nombre_cultivo) DO NOTHING;

-- Datos de demostración: solo se insertan si no hay productores.
DO $$
DECLARE
    v_productor INTEGER;
    v_parcela   INTEGER;
    v_analisis  INTEGER;
BEGIN
    IF EXISTS (SELECT 1 FROM productor) THEN
        RETURN;
    END IF;

    INSERT INTO productor (nombre, apellido, identificacion, telefono, correo, direccion)
    VALUES ('Productor', 'Demo', '100000001', '8888-0000', 'demo@ejemplo.com', 'Zona rural, Costa Rica')
    RETURNING id_productor INTO v_productor;

    INSERT INTO parcela (nombre_parcela, ubicacion, area, coordenadas_gps, id_productor)
    VALUES ('Lote Norte', 'Finca Demo', 500, '9.9281, -84.0907', v_productor)
    RETURNING id_parcela INTO v_parcela;

    INSERT INTO analisis_suelo (fecha_analisis, ph, materia_organica, textura, humedad, observaciones, id_parcela)
    VALUES ('2026-03-15', 5.2, 2.1, 'Franco arcilloso', 28, 'Primer análisis de la parcela', v_parcela)
    RETURNING id_analisis INTO v_analisis;

    INSERT INTO detalle_nutriente (valor, id_analisis, id_nutriente)
    SELECT d.valor, v_analisis, n.id_nutriente
    FROM (VALUES ('Nitrógeno (N)', '0.15'), ('Fósforo (P)', '8'), ('Potasio (K)', '0.25')) AS d(nombre, valor)
    JOIN nutriente n ON n.nombre = d.nombre;

    INSERT INTO analisis_suelo (fecha_analisis, ph, materia_organica, textura, humedad, observaciones, id_parcela)
    VALUES ('2026-09-10', 5.8, 2.8, 'Franco arcilloso', 31, 'Después de encalado', v_parcela)
    RETURNING id_analisis INTO v_analisis;

    INSERT INTO detalle_nutriente (valor, id_analisis, id_nutriente)
    SELECT d.valor, v_analisis, n.id_nutriente
    FROM (VALUES ('Nitrógeno (N)', '0.22'), ('Fósforo (P)', '12'), ('Potasio (K)', '0.40')) AS d(nombre, valor)
    JOIN nutriente n ON n.nombre = d.nombre;
END $$;
