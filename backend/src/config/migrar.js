const { consultar } = require('./database');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

/**
 * Ejecuta el esquema SQL para crear las tablas de ÁBACO.
 */
async function migrar() {
  console.log('🔄 Iniciando migración de base de datos ÁBACO...');
  try {
    const schemaSQL = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
    await consultar(schemaSQL);
    console.log('✅ Esquema creado correctamente.');
  } catch (error) {
    console.error('❌ Error durante la migración:', error.message);
    process.exit(1);
  }
  process.exit(0);
}

migrar();
