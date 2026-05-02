const { Pool } = require('pg');
require('dotenv').config();

// Configuración del pool de conexiones a PostgreSQL
const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME     || 'abaco_db',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || '',
  max:      20,       // máximo de conexiones en el pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Verificar conexión al iniciar
pool.on('connect', () => {
  if (process.env.NODE_ENV !== 'production') {
    console.log('✅ Conexión establecida con PostgreSQL');
  }
});

pool.on('error', (err) => {
  console.error('❌ Error inesperado en el pool de PostgreSQL:', err);
  process.exit(-1);
});

/**
 * Ejecuta una consulta SQL con parámetros opcionales.
 * @param {string} texto - Consulta SQL
 * @param {Array} parametros - Parámetros de la consulta
 */
const consultar = async (texto, parametros = []) => {
  const inicio = Date.now();
  try {
    const resultado = await pool.query(texto, parametros);
    const duracion = Date.now() - inicio;
    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 Consulta ejecutada en ${duracion}ms`);
    }
    return resultado;
  } catch (error) {
    console.error('❌ Error en consulta SQL:', error.message);
    throw error;
  }
};

/**
 * Ejecuta múltiples consultas dentro de una transacción.
 * @param {Function} callback - Función que recibe el cliente y ejecuta las consultas
 */
const transaccion = async (callback) => {
  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');
    const resultado = await callback(cliente);
    await cliente.query('COMMIT');
    return resultado;
  } catch (error) {
    await cliente.query('ROLLBACK');
    throw error;
  } finally {
    cliente.release();
  }
};

module.exports = { pool, consultar, transaccion };
