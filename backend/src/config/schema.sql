-- ============================================================
-- ÁBACO — Esquema de Base de Datos PostgreSQL
-- Plataforma de Inteligencia Electoral y Territorial
-- ============================================================

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis"; -- Para georreferenciación (opcional)

-- ============================================================
-- MÓDULO 1: USUARIOS Y CONTROL DE ACCESOS
-- ============================================================

CREATE TYPE rol_usuario AS ENUM (
  'superadmin',
  'admin',
  'estratega',
  'analista',
  'coordinador',
  'observador'
);

CREATE TABLE usuarios (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre        VARCHAR(100) NOT NULL,
  apellido      VARCHAR(100) NOT NULL,
  email         VARCHAR(150) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  rol           rol_usuario NOT NULL DEFAULT 'observador',
  activo        BOOLEAN DEFAULT TRUE,
  ultimo_acceso TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE sesiones (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id    UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  refresh_token TEXT NOT NULL,
  ip_address    INET,
  user_agent    TEXT,
  expires_at    TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MÓDULO 2: TERRITORIOS Y GEORREFERENCIACIÓN
-- ============================================================

CREATE TYPE nivel_territorial AS ENUM (
  'pais',
  'departamento',
  'municipio',
  'localidad',
  'barrio',
  'zona',
  'sector',
  'mesa'
);

CREATE TABLE territorios (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo          VARCHAR(20) UNIQUE,
  nombre          VARCHAR(150) NOT NULL,
  nivel           nivel_territorial NOT NULL,
  padre_id        UUID REFERENCES territorios(id),
  latitud         DECIMAL(10,8),
  longitud        DECIMAL(11,8),
  geojson         JSONB,
  poblacion       INTEGER,
  votantes_censo  INTEGER,
  prioridad       SMALLINT DEFAULT 3 CHECK (prioridad BETWEEN 1 AND 5),
  notas           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MÓDULO 3: DATOS ELECTORALES Y ESTADÍSTICOS
-- ============================================================

CREATE TABLE elecciones (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre      VARCHAR(200) NOT NULL,
  tipo        VARCHAR(100),
  fecha       DATE,
  descripcion TEXT,
  activa      BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE resultados_electorales (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  eleccion_id     UUID REFERENCES elecciones(id) ON DELETE CASCADE,
  territorio_id   UUID REFERENCES territorios(id),
  candidato       VARCHAR(200),
  partido         VARCHAR(200),
  votos           INTEGER DEFAULT 0,
  porcentaje      DECIMAL(6,3),
  votos_nulos     INTEGER DEFAULT 0,
  votos_blancos   INTEGER DEFAULT 0,
  total_votantes  INTEGER DEFAULT 0,
  abstencion      DECIMAL(6,3),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE indicadores (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre          VARCHAR(200) NOT NULL,
  descripcion     TEXT,
  categoria       VARCHAR(100),
  unidad          VARCHAR(50),
  fuente          VARCHAR(200),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE valores_indicadores (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  indicador_id    UUID REFERENCES indicadores(id) ON DELETE CASCADE,
  territorio_id   UUID REFERENCES territorios(id),
  valor           DECIMAL(15,4),
  fecha           DATE,
  periodo         VARCHAR(20),
  fuente_dato     VARCHAR(200),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MÓDULO 4: GESTIÓN ORGANIZACIONAL
-- ============================================================

CREATE TABLE campanas (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre      VARCHAR(200) NOT NULL,
  descripcion TEXT,
  fecha_inicio DATE,
  fecha_fin   DATE,
  estado      VARCHAR(50) DEFAULT 'planificacion',
  presupuesto DECIMAL(15,2),
  activa      BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE equipos (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campana_id  UUID REFERENCES campanas(id) ON DELETE CASCADE,
  nombre      VARCHAR(150) NOT NULL,
  descripcion TEXT,
  territorio_id UUID REFERENCES territorios(id),
  lider_id    UUID REFERENCES usuarios(id),
  activo      BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE miembros_equipo (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  equipo_id   UUID REFERENCES equipos(id) ON DELETE CASCADE,
  usuario_id  UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  rol_equipo  VARCHAR(100),
  fecha_ingreso DATE DEFAULT CURRENT_DATE,
  activo      BOOLEAN DEFAULT TRUE,
  UNIQUE(equipo_id, usuario_id)
);

CREATE TABLE contactos (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombres         VARCHAR(150) NOT NULL,
  apellidos       VARCHAR(150),
  documento       VARCHAR(20),
  telefono        VARCHAR(20),
  email           VARCHAR(150),
  territorio_id   UUID REFERENCES territorios(id),
  tipo            VARCHAR(50) DEFAULT 'ciudadano',
  lider_comunitario BOOLEAN DEFAULT FALSE,
  simpatizante    BOOLEAN DEFAULT FALSE,
  voluntario      BOOLEAN DEFAULT FALSE,
  notas           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MÓDULO 5: FINANCIERO
-- ============================================================

CREATE TABLE presupuestos (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campana_id  UUID REFERENCES campanas(id) ON DELETE CASCADE,
  nombre      VARCHAR(200) NOT NULL,
  monto_total DECIMAL(15,2) NOT NULL,
  periodo     VARCHAR(50),
  descripcion TEXT,
  activo      BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE categorias_gasto (
  id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre  VARCHAR(100) NOT NULL,
  codigo  VARCHAR(20),
  color   VARCHAR(7) DEFAULT '#6B7280'
);

CREATE TABLE transacciones (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  presupuesto_id  UUID REFERENCES presupuestos(id),
  categoria_id    UUID REFERENCES categorias_gasto(id),
  tipo            VARCHAR(20) NOT NULL CHECK (tipo IN ('ingreso', 'egreso', 'donacion')),
  monto           DECIMAL(15,2) NOT NULL,
  descripcion     VARCHAR(500) NOT NULL,
  fecha           DATE NOT NULL,
  referencia      VARCHAR(100),
  comprobante_url TEXT,
  registrado_por  UUID REFERENCES usuarios(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MÓDULO 6: ALERTAS Y ESTRATEGIA
-- ============================================================

CREATE TYPE severidad_alerta AS ENUM ('baja', 'media', 'alta', 'critica');

CREATE TABLE alertas (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  titulo        VARCHAR(300) NOT NULL,
  descripcion   TEXT,
  severidad     severidad_alerta DEFAULT 'media',
  territorio_id UUID REFERENCES territorios(id),
  tipo          VARCHAR(100),
  resuelta      BOOLEAN DEFAULT FALSE,
  creado_por    UUID REFERENCES usuarios(id),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tareas (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  titulo          VARCHAR(300) NOT NULL,
  descripcion     TEXT,
  estado          VARCHAR(50) DEFAULT 'pendiente',
  prioridad       VARCHAR(20) DEFAULT 'media',
  asignado_a      UUID REFERENCES usuarios(id),
  campana_id      UUID REFERENCES campanas(id),
  territorio_id   UUID REFERENCES territorios(id),
  fecha_limite    DATE,
  completada_en   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ÍNDICES PARA RENDIMIENTO
-- ============================================================

CREATE INDEX idx_territorios_nivel ON territorios(nivel);
CREATE INDEX idx_territorios_padre ON territorios(padre_id);
CREATE INDEX idx_resultados_eleccion ON resultados_electorales(eleccion_id);
CREATE INDEX idx_resultados_territorio ON resultados_electorales(territorio_id);
CREATE INDEX idx_transacciones_presupuesto ON transacciones(presupuesto_id);
CREATE INDEX idx_transacciones_tipo ON transacciones(tipo);
CREATE INDEX idx_alertas_territorio ON alertas(territorio_id);
CREATE INDEX idx_alertas_resuelta ON alertas(resuelta);
CREATE INDEX idx_contactos_territorio ON contactos(territorio_id);
CREATE INDEX idx_valores_indicador ON valores_indicadores(indicador_id, territorio_id);

-- ============================================================
-- FUNCIÓN: actualizar updated_at automáticamente
-- ============================================================

CREATE OR REPLACE FUNCTION actualizar_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_usuarios_updated BEFORE UPDATE ON usuarios FOR EACH ROW EXECUTE FUNCTION actualizar_updated_at();
CREATE TRIGGER trg_territorios_updated BEFORE UPDATE ON territorios FOR EACH ROW EXECUTE FUNCTION actualizar_updated_at();
CREATE TRIGGER trg_resultados_updated BEFORE UPDATE ON resultados_electorales FOR EACH ROW EXECUTE FUNCTION actualizar_updated_at();
CREATE TRIGGER trg_campanas_updated BEFORE UPDATE ON campanas FOR EACH ROW EXECUTE FUNCTION actualizar_updated_at();
CREATE TRIGGER trg_contactos_updated BEFORE UPDATE ON contactos FOR EACH ROW EXECUTE FUNCTION actualizar_updated_at();
CREATE TRIGGER trg_alertas_updated BEFORE UPDATE ON alertas FOR EACH ROW EXECUTE FUNCTION actualizar_updated_at();
CREATE TRIGGER trg_tareas_updated BEFORE UPDATE ON tareas FOR EACH ROW EXECUTE FUNCTION actualizar_updated_at();
