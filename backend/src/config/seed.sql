-- ============================================================
-- ÁBACO — Datos Iniciales (Semilla)
-- ============================================================

-- Usuario administrador inicial
-- Contraseña: Abaco2024! (cambiar después del primer acceso)
INSERT INTO usuarios (id, nombre, apellido, email, password_hash, rol) VALUES
(
  uuid_generate_v4(),
  'Admin',
  'ÁBACO',
  'admin@abaco.com',
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LpHjL.UiVJnZV6hgu',
  'superadmin'
);

-- Campaña de ejemplo
INSERT INTO campanas (nombre, descripcion, fecha_inicio, fecha_fin, estado, presupuesto) VALUES
('Campaña Municipal 2026', 'Campaña principal para elecciones municipales', '2026-01-01', '2026-10-26', 'activa', 50000000);

-- Categorías de gasto iniciales
INSERT INTO categorias_gasto (nombre, codigo, color) VALUES
('Publicidad y Comunicación', 'PUBLI', '#3B82F6'),
('Logística y Transporte', 'LOGIS', '#10B981'),
('Personal', 'PERS', '#F59E0B'),
('Material de Campaña', 'MAT', '#EF4444'),
('Eventos y Actos', 'EVE', '#8B5CF6'),
('Tecnología', 'TEC', '#06B6D4'),
('Alimentación', 'ALI', '#F97316'),
('Otros', 'OTROS', '#6B7280');

-- Territorios de ejemplo (Colombia)
INSERT INTO territorios (codigo, nombre, nivel, padre_id) VALUES
('COL', 'Colombia', 'pais', NULL);

-- Indicadores base
INSERT INTO indicadores (nombre, descripcion, categoria, unidad) VALUES
('Potencial de Voto', 'Estimación de votos alcanzables en el territorio', 'Electoral', 'Votos'),
('Nivel de Penetración', 'Porcentaje de contactos sobre total de votantes', 'Electoral', '%'),
('Índice de Apoyo', 'Nivel de apoyo percibido en el territorio', 'Percepción', 'Escala 1-10'),
('Participación Histórica', 'Promedio de participación electoral histórica', 'Electoral', '%'),
('Líderes Identificados', 'Número de líderes comunitarios contactados', 'Organizacional', 'Personas');

-- Alertas de ejemplo
INSERT INTO alertas (titulo, descripcion, severidad, tipo) VALUES
('Sistema iniciado correctamente', 'ÁBACO ha sido configurado y está operativo', 'baja', 'sistema'),
('Completar perfil del territorio', 'Es necesario cargar los datos territoriales para activar el análisis geográfico', 'media', 'configuracion');
