-- ============================================================
-- AppAlambrado Pro — esquema Turso (base NUEVA, no reutilizar
-- la de MolineroApp)
-- ------------------------------------------------------------
-- Cómo usar:
--   1. Crear la base:  turso db create appalambrado-pro
--   2. Aplicar este archivo:
--      turso db shell appalambrado-pro < turso-schema.sql
--      (o pegar el contenido en el dashboard de Turso)
-- Las columnas son el espejo snake_case de los objetos
-- guardados en Dexie (ver js/turso.js, funciones *ToRow).
-- Los campos JSON (params, medicion, resumen, reales, etc.)
-- se guardan como TEXT con JSON.stringify.
-- ============================================================

CREATE TABLE IF NOT EXISTS proyectos (
  id          TEXT PRIMARY KEY,
  cliente     TEXT NOT NULL DEFAULT '',
  campo       TEXT,
  telefono    TEXT,
  localidad   TEXT,
  tipo        TEXT NOT NULL DEFAULT 'suspendido7',
  params      TEXT NOT NULL DEFAULT '{}',
  medicion    TEXT NOT NULL DEFAULT '{}',
  mo          TEXT NOT NULL DEFAULT '{}',
  log         TEXT NOT NULL DEFAULT '{}',
  porc        TEXT NOT NULL DEFAULT '{}',
  estado      TEXT NOT NULL DEFAULT 'borrador',
  resumen     TEXT NOT NULL DEFAULT '{}',
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_proyectos_estado ON proyectos(estado);

CREATE TABLE IF NOT EXISTS proyecto_items (
  id          TEXT PRIMARY KEY,
  proyecto_id TEXT NOT NULL,
  categoria   TEXT NOT NULL DEFAULT 'material',
  codigo      TEXT NOT NULL DEFAULT '',
  descripcion TEXT NOT NULL DEFAULT '',
  unidad      TEXT NOT NULL DEFAULT '',
  cantidad    REAL NOT NULL DEFAULT 0,
  precio_unit REAL,
  created_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_proyecto_items_proyecto ON proyecto_items(proyecto_id);

CREATE TABLE IF NOT EXISTS precios (
  id          TEXT PRIMARY KEY,
  codigo      TEXT NOT NULL UNIQUE,
  descripcion TEXT NOT NULL DEFAULT '',
  unidad      TEXT NOT NULL DEFAULT '',
  precio      REAL NOT NULL DEFAULT 0,
  categoria   TEXT NOT NULL DEFAULT 'material',
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_precios_codigo ON precios(codigo);

CREATE TABLE IF NOT EXISTS ejecucion (
  id                    TEXT PRIMARY KEY,
  proyecto_id           TEXT NOT NULL UNIQUE,
  reales                TEXT NOT NULL DEFAULT '{}',
  dias_reales           REAL,
  costo_mano_obra_real  REAL,
  km_reales             REAL,
  precio_km_real        REAL,
  viaticos_reales       REAL,
  otros_costos          TEXT NOT NULL DEFAULT '[]',
  fecha                 TEXT,
  observaciones         TEXT,
  created_at            INTEGER NOT NULL,
  updated_at            INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ejecucion_proyecto ON ejecucion(proyecto_id);
