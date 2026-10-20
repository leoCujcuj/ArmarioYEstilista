const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'armario_user',
  password: process.env.DB_PASS || 'armario_pass',
  database: process.env.DB_NAME || 'armario_db',
  port: 5432,
});

const createTables = async () => {
  const client = await pool.connect();
  try {
    console.log('Iniciando migración de tablas...');

    // Tabla de Usuarios
    await client.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        genero VARCHAR(50),
        objetivo TEXT,
        estilos_preferidos JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Tabla de Biometría
    await client.query(`
      CREATE TABLE IF NOT EXISTS biometria (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
        foto_cara_url TEXT,
        foto_cuerpo_url TEXT,
        morfologia_ia VARCHAR(100),
        colorimetria_ia VARCHAR(100),
        medidas JSONB,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Tabla de Favoritos (Outfits)
    await client.query(`
      CREATE TABLE IF NOT EXISTS favoritos (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
        outfit_data JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('Tablas creadas exitosamente.');
  } catch (err) {
    console.error('Error en la migración:', err);
  } finally {
    client.release();
    process.exit();
  }
};

createTables();
