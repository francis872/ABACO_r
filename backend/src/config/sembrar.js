const { consultar } = require('./database');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

/**
 * Inserta los datos iniciales necesarios para operar ÁBACO.
 */
async function sembrar() {
  console.log('🌱 Insertando datos iniciales...');
  try {
    const seedSQL = fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf-8');
    await consultar(seedSQL);
    console.log('✅ Datos iniciales insertados correctamente.');
    console.log('👤 Usuario admin: admin@abaco.com / Abaco2024!');
  } catch (error) {
    console.error('❌ Error al insertar datos iniciales:', error.message);
    process.exit(1);
  }
  process.exit(0);
}

sembrar();
