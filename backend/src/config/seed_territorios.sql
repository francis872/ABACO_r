DO $$
DECLARE
  colombia_id UUID := '637353ad-499e-4e26-a50d-9341ad1fe4ac';
  admin_id UUID;
BEGIN
  SELECT id INTO admin_id FROM usuarios WHERE email = 'admin@abaco.com' LIMIT 1;

  -- Actualizar Colombia con coordenadas
  UPDATE territorios SET latitud=4.5709, longitud=-74.2973,
    geom=ST_SetSRID(ST_MakePoint(-74.2973,4.5709),4326)
  WHERE id = colombia_id;

  -- 32 departamentos + Bogotá D.C.
  INSERT INTO territorios (nombre,codigo,nivel,padre_id,poblacion,votantes_censo,prioridad,latitud,longitud,geom) VALUES
    ('Amazonas','AMZ','departamento',colombia_id,76243,52000,1,-1.4429,-71.5724,ST_SetSRID(ST_MakePoint(-71.5724,-1.4429),4326)),
    ('Antioquia','ANT','departamento',colombia_id,6407102,4200000,5,6.7009,-75.5144,ST_SetSRID(ST_MakePoint(-75.5144,6.7009),4326)),
    ('Arauca','ARC','departamento',colombia_id,294896,198000,3,6.5477,-71.0022,ST_SetSRID(ST_MakePoint(-71.0022,6.5477),4326)),
    ('Atlántico','ATL','departamento',colombia_id,2535517,1600000,5,10.6966,-74.8741,ST_SetSRID(ST_MakePoint(-74.8741,10.6966),4326)),
    ('Bolívar','BOL','departamento',colombia_id,2070010,1280000,4,8.6704,-74.0321,ST_SetSRID(ST_MakePoint(-74.0321,8.6704),4326)),
    ('Boyacá','BOY','departamento',colombia_id,1276407,820000,3,5.4545,-73.3620,ST_SetSRID(ST_MakePoint(-73.3620,5.4545),4326)),
    ('Caldas','CAL','departamento',colombia_id,1011848,660000,3,5.2983,-75.2479,ST_SetSRID(ST_MakePoint(-75.2479,5.2983),4326)),
    ('Caquetá','CAQ','departamento',colombia_id,509494,310000,2,1.6143,-75.6062,ST_SetSRID(ST_MakePoint(-75.6062,1.6143),4326)),
    ('Casanare','CAS','departamento',colombia_id,420504,275000,2,5.7589,-71.5724,ST_SetSRID(ST_MakePoint(-71.5724,5.7589),4326)),
    ('Cauca','CAU','departamento',colombia_id,1464488,880000,3,2.4448,-76.6147,ST_SetSRID(ST_MakePoint(-76.6147,2.4448),4326)),
    ('Cesar','CES','departamento',colombia_id,1100000,700000,3,9.3373,-73.6536,ST_SetSRID(ST_MakePoint(-73.6536,9.3373),4326)),
    ('Chocó','CHO','departamento',colombia_id,539590,315000,2,5.6948,-76.6611,ST_SetSRID(ST_MakePoint(-76.6611,5.6948),4326)),
    ('Córdoba','COR','departamento',colombia_id,1784783,1080000,4,8.3549,-75.8814,ST_SetSRID(ST_MakePoint(-75.8814,8.3549),4326)),
    ('Cundinamarca','CUN','departamento',colombia_id,3242278,2100000,5,4.9981,-74.0985,ST_SetSRID(ST_MakePoint(-74.0985,4.9981),4326)),
    ('Guainía','GUA','departamento',colombia_id,50636,32000,1,3.8653,-67.9239,ST_SetSRID(ST_MakePoint(-67.9239,3.8653),4326)),
    ('Guaviare','GVR','departamento',colombia_id,127695,80000,2,2.0407,-72.3344,ST_SetSRID(ST_MakePoint(-72.3344,2.0407),4326)),
    ('Huila','HUI','departamento',colombia_id,1168000,750000,3,2.5359,-75.5277,ST_SetSRID(ST_MakePoint(-75.5277,2.5359),4326)),
    ('La Guajira','LAG','departamento',colombia_id,880000,530000,3,11.3548,-72.5205,ST_SetSRID(ST_MakePoint(-72.5205,11.3548),4326)),
    ('Magdalena','MAG','departamento',colombia_id,1321000,840000,3,10.4113,-74.4057,ST_SetSRID(ST_MakePoint(-74.4057,10.4113),4326)),
    ('Meta','MET','departamento',colombia_id,1039722,660000,3,3.9960,-73.5609,ST_SetSRID(ST_MakePoint(-73.5609,3.9960),4326)),
    ('Nariño','NAR','departamento',colombia_id,1630000,1020000,3,1.2036,-77.2811,ST_SetSRID(ST_MakePoint(-77.2811,1.2036),4326)),
    ('Norte de Santander','NDS','departamento',colombia_id,1548172,985000,4,7.9463,-72.8988,ST_SetSRID(ST_MakePoint(-72.8988,7.9463),4326)),
    ('Putumayo','PUT','departamento',colombia_id,348180,210000,2,0.4359,-76.6456,ST_SetSRID(ST_MakePoint(-76.6456,0.4359),4326)),
    ('Quindío','QUI','departamento',colombia_id,562119,370000,3,4.4610,-75.6674,ST_SetSRID(ST_MakePoint(-75.6674,4.4610),4326)),
    ('Risaralda','RIS','departamento',colombia_id,994497,640000,3,5.3158,-75.9741,ST_SetSRID(ST_MakePoint(-75.9741,5.3158),4326)),
    ('San Andrés','SAN','departamento',colombia_id,79984,58000,2,12.5847,-81.7006,ST_SetSRID(ST_MakePoint(-81.7006,12.5847),4326)),
    ('Santander','SND','departamento',colombia_id,2206477,1440000,4,6.6437,-73.6536,ST_SetSRID(ST_MakePoint(-73.6536,6.6437),4326)),
    ('Sucre','SUC','departamento',colombia_id,904713,570000,3,9.0000,-75.4000,ST_SetSRID(ST_MakePoint(-75.4000,9.0000),4326)),
    ('Tolima','TOL','departamento',colombia_id,1228763,790000,4,3.9981,-75.3108,ST_SetSRID(ST_MakePoint(-75.3108,3.9981),4326)),
    ('Valle del Cauca','VAC','departamento',colombia_id,4532378,2950000,5,3.8009,-76.6413,ST_SetSRID(ST_MakePoint(-76.6413,3.8009),4326)),
    ('Vaupés','VAP','departamento',colombia_id,47162,28000,1,0.8554,-70.8119,ST_SetSRID(ST_MakePoint(-70.8119,0.8554),4326)),
    ('Vichada','VIC','departamento',colombia_id,107152,65000,1,4.4234,-69.2877,ST_SetSRID(ST_MakePoint(-69.2877,4.4234),4326)),
    ('Bogotá D.C.','BOG','municipio',colombia_id,7412566,5200000,5,4.7110,-74.0721,ST_SetSRID(ST_MakePoint(-74.0721,4.7110),4326))
  ON CONFLICT (codigo) DO UPDATE SET
    latitud=EXCLUDED.latitud, longitud=EXCLUDED.longitud, geom=EXCLUDED.geom,
    poblacion=EXCLUDED.poblacion, votantes_censo=EXCLUDED.votantes_censo,
    prioridad=EXCLUDED.prioridad, padre_id=EXCLUDED.padre_id;

  -- Eventos de muestra en territorios prioritarios
  DELETE FROM eventos_mapa WHERE titulo IN (
    'Reunión comité departamental','Zona de seguimiento prioritario',
    'Campaña puerta a puerta activa','Encuesta de intención de voto',
    'Caravana electoral programada'
  );

  INSERT INTO eventos_mapa (territorio_id,usuario_id,tipo,titulo,descripcion,latitud,longitud,geom)
  SELECT t.id, admin_id, 'reunion',
    'Reunión comité departamental',
    'Convocatoria líderes municipales — ' || t.nombre,
    t.latitud+0.05, t.longitud+0.05,
    ST_SetSRID(ST_MakePoint(t.longitud+0.05,t.latitud+0.05),4326)
  FROM territorios t WHERE t.prioridad=5 AND t.latitud IS NOT NULL;

  INSERT INTO eventos_mapa (territorio_id,usuario_id,tipo,titulo,descripcion,latitud,longitud,geom)
  SELECT t.id, admin_id, 'alerta',
    'Zona de seguimiento prioritario',
    'Monitoreo intensivo de votantes indecisos — ' || t.nombre,
    t.latitud-0.08, t.longitud-0.08,
    ST_SetSRID(ST_MakePoint(t.longitud-0.08,t.latitud-0.08),4326)
  FROM territorios t WHERE t.prioridad>=4 AND t.latitud IS NOT NULL
  LIMIT 6;

  INSERT INTO eventos_mapa (territorio_id,usuario_id,tipo,titulo,descripcion,latitud,longitud,geom)
  SELECT t.id, admin_id, 'encuesta',
    'Encuesta de intención de voto',
    'Resultados preliminares disponibles — ' || t.nombre,
    t.latitud+0.12, t.longitud-0.12,
    ST_SetSRID(ST_MakePoint(t.longitud-0.12,t.latitud+0.12),4326)
  FROM territorios t WHERE t.nivel='departamento' AND t.latitud IS NOT NULL
  ORDER BY RANDOM() LIMIT 8;

  INSERT INTO eventos_mapa (territorio_id,usuario_id,tipo,titulo,descripcion,latitud,longitud,geom)
  VALUES (
    (SELECT id FROM territorios WHERE codigo='BOG'),
    admin_id, 'evento',
    'Caravana electoral programada',
    'Recorrido por localidades sur de Bogotá',
    4.5980, -74.0760,
    ST_SetSRID(ST_MakePoint(-74.0760,4.5980),4326)
  );

  RAISE NOTICE 'Seed territorial completado: departamentos + eventos insertados.';
END;
$$;
