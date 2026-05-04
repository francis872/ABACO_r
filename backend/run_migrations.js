const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const client = new Client({
  host: 'dpg-d7r2krpkh4rs73ejitug-a.oregon-postgres.render.com',
  port: 5432,
  database: 'abaco_db',
  user: 'abaco_db_user',
  password: 'P4BOKz0Lyo46nHkGS52K482iY4RK8QFl',
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 30000,
});

const migrations = [
  'src/config/schema.sql',
  'src/config/social_migration.sql',
  'src/config/seed.sql',
];

async function run() {
  try {
    console.log('Connecting to Render PostgreSQL...');
    await client.connect();
    console.log('Connected!');

    for (const file of migrations) {
      const filePath = path.join(__dirname, file);
      if (!fs.existsSync(filePath)) {
        console.log(`SKIP (not found): ${file}`);
        continue;
      }
      const sql = fs.readFileSync(filePath, 'utf8');
      console.log(`Running: ${file}`);
      await client.query(sql);
      console.log(`  OK: ${file}`);
    }

    console.log('\nAll migrations completed!');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
