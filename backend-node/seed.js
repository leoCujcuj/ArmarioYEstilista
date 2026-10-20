require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const Usuario = require('./models/Usuario');
const Prenda = require('./models/Prenda');
const Look = require('./models/Look');
const Producto = require('./models/Producto');
const Uso = require('./models/Uso');
const ChatSession = require('./models/ChatSession');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/armario';
const SEED_EMAIL = process.env.SEED_EMAIL || 'armario@local.gt';
const SEED_PASSWORD = process.env.SEED_PASSWORD || 'armario123';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'armario_user',
  password: process.env.DB_PASS || 'armario_pass',
  database: process.env.DB_NAME || 'armario_db',
  port: 5434, // Puerto expuesto en docker-compose
});

const resetAndSeed = async () => {
  try {
    console.log('Iniciando reseteo total de bases de datos...');

    // 1. Conectar a MongoDB
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB conectado.');

    // 2. Limpiar todas las colecciones de MongoDB
    console.log('Limpiando colecciones de MongoDB...');
    await Usuario.deleteMany({});
    await Prenda.deleteMany({});
    await Look.deleteMany({});
    await Producto.deleteMany({});
    await Uso.deleteMany({});
    await ChatSession.deleteMany({});
    console.log('MongoDB completamente limpio.');

    // 3. Crear usuario Seed con contraseña hasheada
    const hashedPassword = await bcrypt.hash(SEED_PASSWORD, 10);
    const usuarioSeed = new Usuario({
      nombre: 'Armario Local',
      email: SEED_EMAIL,
      password: hashedPassword,
      edad: 28,
      direccion: 'Ciudad de Guatemala, Guatemala',
      presupuesto: 1500,
      gastado: 0,
      settings: {
        idioma: 'es',
        atrevimiento: 60
      },
      biometria: {
        genero: 'Masculina',
        objetivo: 'Proyectar una imagen ejecutiva y moderna',
        estilos: ['CASUAL', 'SMART CASUAL', 'MINIMALISTA'],
        morfologia: 'Triángulo Invertido',
        proporcionVertical: 'Equilibrada',
        recomendacionCorte: 'Pantalones de corte recto o ligeramente holgados para equilibrar hombros amplios',
        colorimetria: 'Otoño Cálido',
        subtono: 'Cálido',
        paletaRecomendada: ['Verde Oliva', 'Azul Marino', 'Terracota', 'Beige Arena', 'Gris Carbón'],
        formaCara: 'Ovalada',
        tipoPelo: 'Liso 1A',
        medidas: {
          hombros: '112',
          cadera: '96',
          altura: '178'
        },
        likes: [],
        dislikes: [],
        preferenciasFeedback: []
      }
    });

    await usuarioSeed.save();
    console.log(`Usuario creado exitosamente: ${SEED_EMAIL} (ID: ${usuarioSeed._id})`);

    // 4. Crear prendas iniciales de ejemplo limpias de fondo para el usuario
    const prendasEjemplo = [
      {
        usuarioId: usuarioSeed._id,
        nombre: 'Camisa Oxford Blanca Clásica',
        categoria: 'Top',
        url_imagen_limpia: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=700&q=80',
        color_principal: 'Blanco',
        color_hex: '#ffffff',
        subtono: 'Neutro',
        material: 'Algodón 100%',
        corte_silueta: 'Regular',
        estilo: 'Smart Casual',
        temporada: 'Todo el año',
        formalidad: 4,
        contadorUsos: 0,
        tags_ia: ['básico', 'camisa', 'oxford', 'versátil', 'elegante']
      },
      {
        usuarioId: usuarioSeed._id,
        nombre: 'Pantalón Jean Gris Marengo Recto',
        categoria: 'Bottom',
        url_imagen_limpia: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=700&q=80',
        color_principal: 'Gris Marengo',
        color_hex: '#4a4a4a',
        subtono: 'Frío',
        material: 'Denim',
        corte_silueta: 'Recto',
        estilo: 'Casual',
        temporada: 'Todo el año',
        formalidad: 3,
        contadorUsos: 0,
        tags_ia: ['jean', 'denim', 'recto', 'gris', 'duradero']
      },
      {
        usuarioId: usuarioSeed._id,
        nombre: 'Blazer Desestructurado Azul Marino',
        categoria: 'Outerwear',
        url_imagen_limpia: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=700&q=80',
        color_principal: 'Azul Marino',
        color_hex: '#1b2a4a',
        subtono: 'Frío',
        material: 'Lana Fría',
        corte_silueta: 'Estructurado',
        estilo: 'Smart Casual',
        temporada: 'Entretiempo',
        formalidad: 4,
        contadorUsos: 0,
        tags_ia: ['blazer', 'sastrería', 'azul marino', 'capas', 'ejecutivo']
      },
      {
        usuarioId: usuarioSeed._id,
        nombre: 'Botines Chelsea de Piel Mate',
        categoria: 'Shoes',
        url_imagen_limpia: 'https://images.unsplash.com/photo-1608256246200-53e635b5b65f?w=700&q=80',
        color_principal: 'Negro',
        color_hex: '#111111',
        subtono: 'Neutro',
        material: 'Cuero Genuino',
        corte_silueta: 'Bota',
        estilo: 'Smart Casual',
        temporada: 'Todo el año',
        formalidad: 4,
        contadorUsos: 0,
        tags_ia: ['botines', 'chelsea', 'cuero', 'calzado', 'atemporal']
      },
      {
        usuarioId: usuarioSeed._id,
        nombre: 'Camiseta Básica de Cuello Redondo Beige Arena',
        categoria: 'Top',
        url_imagen_limpia: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=700&q=80',
        color_principal: 'Beige Arena',
        color_hex: '#d8c4a6',
        subtono: 'Cálido',
        material: 'Algodón Pima',
        corte_silueta: 'Regular',
        estilo: 'Minimalista',
        temporada: 'Verano',
        formalidad: 2,
        contadorUsos: 0,
        tags_ia: ['camiseta', 'básico', 'beige', 'pima', 'ligero']
      }
    ];

    const prendasInsertadas = await Prenda.insertMany(prendasEjemplo);
    console.log(`${prendasInsertadas.length} prendas iniciales creadas en el armario.`);

    // 5. Crear un primer look favorito de ejemplo validado (sirve como respaldo Nivel 3)
    const lookInicial = new Look({
      usuarioId: usuarioSeed._id,
      prendas: [prendasInsertadas[0]._id, prendasInsertadas[1]._id, prendasInsertadas[2]._id, prendasInsertadas[3]._id],
      ocasion: 'Oficina',
      explicacion: 'Combinación Smart Casual que equilibra hombros y cadera mediante el corte recto del pantalón y la estructura desestructurada del blazer.',
      consejo_color: 'El azul marino del blazer contrasta con la camisa blanca aportando luminosidad al rostro, mientras el jean gris actúa como neutro de anclaje.',
      score: { color: 92, balance: 94 },
      liked: true
    });
    await lookInicial.save();
    console.log('Look favorito inicial registrado.');

    // 6. Reseteo y migración de tablas en PostgreSQL
    try {
      const pgClient = await pool.connect();
      console.log('PostgreSQL conectado. Reiniciando tablas...');
      await pgClient.query('DROP TABLE IF EXISTS favoritos, biometria, usuarios CASCADE;');

      await pgClient.query(`
        CREATE TABLE usuarios (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          genero VARCHAR(50),
          objetivo TEXT,
          estilos_preferidos JSONB,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE biometria (
          id SERIAL PRIMARY KEY,
          usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
          foto_cara_url TEXT,
          foto_cuerpo_url TEXT,
          morfologia_ia VARCHAR(100),
          colorimetria_ia VARCHAR(100),
          medidas JSONB,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE favoritos (
          id SERIAL PRIMARY KEY,
          usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
          outfit_data JSONB,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await pgClient.query(`
        INSERT INTO usuarios (email, password_hash, genero, objetivo, estilos_preferidos)
        VALUES ($1, $2, $3, $4, $5);
      `, [SEED_EMAIL, hashedPassword, 'Masculina', 'Proyectar una imagen ejecutiva y moderna', JSON.stringify(['CASUAL', 'SMART CASUAL'])]);

      pgClient.release();
      console.log('PostgreSQL limpiado y sincronizado.');
    } catch (pgError) {
      console.warn('Nota: PostgreSQL no conectado o en otro puerto local (se completó MongoDB):', pgError.message);
    }

    console.log('====================================================');
    console.log('RESETEO Y SEED COMPLETADOS EXITOSAMENTE');
    console.log(`Usuario: ${SEED_EMAIL}`);
    console.log(`Contraseña: ${SEED_PASSWORD}`);
    console.log('====================================================');

    process.exit(0);
  } catch (error) {
    console.error('Error durante el reseteo:', error);
    process.exit(1);
  }
};

resetAndSeed();
