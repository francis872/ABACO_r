-- ============================================================
-- ÁBACO — Migración PostGIS + Eventos en Tiempo Real
-- ============================================================

-- 1. Añadir columna geometry a territorios
ALTER TABLE territorios
  ADD COLUMN IF NOT EXISTS geom geometry(Geometry, 4326);

-- 2. Poblar geom desde lat/lon existentes
UPDATE territorios
SET geom = ST_SetSRID(ST_MakePoint(longitud::float, latitud::float), 4326)
WHERE latitud IS NOT NULL AND longitud IS NOT NULL AND geom IS NULL;

-- 3. Trigger: sincronizar geom con latitud/longitud en cada INSERT/UPDATE
CREATE OR REPLACE FUNCTION sync_territorio_geom()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.latitud IS NOT NULL AND NEW.longitud IS NOT NULL THEN
    NEW.geom = ST_SetSRID(ST_MakePoint(NEW.longitud::float, NEW.latitud::float), 4326);
  ELSE
    NEW.geom = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_territorio_geom ON territorios;
CREATE TRIGGER trg_sync_territorio_geom
  BEFORE INSERT OR UPDATE ON territorios
  FOR EACH ROW EXECUTE FUNCTION sync_territorio_geom();

-- 4. Índice espacial GIST
CREATE INDEX IF NOT EXISTS idx_territorios_geom ON territorios USING GIST(geom);

-- 5. Tabla de eventos de mapa en tiempo real
CREATE TABLE IF NOT EXISTS eventos_mapa (
  id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipo           varchar(60)  NOT NULL,                -- incidente, reunion, acto, alerta, observacion
  titulo         varchar(200) NOT NULL,
  descripcion    text,
  geom           geometry(Point, 4326) NOT NULL,
  latitud        numeric(10,8) NOT NULL,
  longitud       numeric(11,8) NOT NULL,
  territorio_id  uuid REFERENCES territorios(id) ON DELETE SET NULL,
  usuario_id     uuid REFERENCES usuarios(id)    ON DELETE SET NULL,
  severidad      severidad_alerta DEFAULT 'media',
  activo         boolean DEFAULT true,
  metadata       jsonb DEFAULT '{}',
  expires_at     timestamptz,
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
);

-- Trigger updated_at
DROP TRIGGER IF EXISTS trg_updated_at_eventos_mapa ON eventos_mapa;
CREATE TRIGGER trg_updated_at_eventos_mapa
  BEFORE UPDATE ON eventos_mapa
  FOR EACH ROW EXECUTE FUNCTION actualizar_updated_at();

-- Índices de eventos
CREATE INDEX IF NOT EXISTS idx_eventos_mapa_geom       ON eventos_mapa USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_eventos_mapa_activo     ON eventos_mapa(activo);
CREATE INDEX IF NOT EXISTS idx_eventos_mapa_tipo       ON eventos_mapa(tipo);
CREATE INDEX IF NOT EXISTS idx_eventos_mapa_territorio ON eventos_mapa(territorio_id);
CREATE INDEX IF NOT EXISTS idx_eventos_mapa_created    ON eventos_mapa(created_at DESC);
