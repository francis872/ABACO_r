-- ============================================================
-- ÁBACO — Módulo Social: Publicaciones, Likes, Comentarios
-- Notificaciones en tiempo real
-- ============================================================

-- Publicaciones
CREATE TABLE IF NOT EXISTS publicaciones (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id    UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  contenido     TEXT NOT NULL CHECK (char_length(contenido) BETWEEN 1 AND 5000),
  territorio_id UUID REFERENCES territorios(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Archivos adjuntos (imágenes y PDFs)
CREATE TABLE IF NOT EXISTS publicacion_adjuntos (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  publicacion_id   UUID NOT NULL REFERENCES publicaciones(id) ON DELETE CASCADE,
  tipo             VARCHAR(10) NOT NULL CHECK (tipo IN ('imagen', 'pdf')),
  url              TEXT NOT NULL,
  nombre_original  TEXT NOT NULL,
  tamano_bytes     INTEGER,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Likes (único por usuario + publicación)
CREATE TABLE IF NOT EXISTS publicacion_likes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id      UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  publicacion_id  UUID NOT NULL REFERENCES publicaciones(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(usuario_id, publicacion_id)
);

-- Comentarios
CREATE TABLE IF NOT EXISTS comentarios (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id      UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  publicacion_id  UUID NOT NULL REFERENCES publicaciones(id) ON DELETE CASCADE,
  contenido       TEXT NOT NULL CHECK (char_length(contenido) BETWEEN 1 AND 2000),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Notificaciones
CREATE TABLE IF NOT EXISTS notificaciones (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id      UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  actor_id        UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  tipo            VARCHAR(20) NOT NULL CHECK (tipo IN ('like', 'comentario')),
  publicacion_id  UUID REFERENCES publicaciones(id) ON DELETE CASCADE,
  leida           BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_publicaciones_usuario   ON publicaciones(usuario_id);
CREATE INDEX IF NOT EXISTS idx_publicaciones_created   ON publicaciones(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_publicaciones_territorio ON publicaciones(territorio_id);
CREATE INDEX IF NOT EXISTS idx_likes_publicacion        ON publicacion_likes(publicacion_id);
CREATE INDEX IF NOT EXISTS idx_comentarios_publicacion  ON comentarios(publicacion_id);
CREATE INDEX IF NOT EXISTS idx_notificaciones_usuario   ON notificaciones(usuario_id, leida);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION actualizar_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_publicaciones_updated_at
  BEFORE UPDATE ON publicaciones
  FOR EACH ROW EXECUTE FUNCTION actualizar_updated_at();
