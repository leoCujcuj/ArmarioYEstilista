require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const axios = require('axios');
const multer = require('multer');
const FormData = require('form-data');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cloudinary = require('cloudinary').v2;
const redis = require('redis');

const Prenda = require('./models/Prenda');
const Usuario = require('./models/Usuario');
const Look = require('./models/Look');
const Producto = require('./models/Producto');
const Uso = require('./models/Uso');
const ChatSession = require('./models/ChatSession');
const { styleAI, seleccionarFotoCurada } = require('./services/styleAI');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// --- CONFIGURACIÓN CLOUDINARY ---
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Helper para subir imágenes Base64 a Cloudinary y evitar saturar MongoDB / localStorage
const subirBase64ACloudinary = async (base64Str, folder = 'armario_ia/perfiles') => {
  if (!base64Str || !base64Str.startsWith('data:image')) return base64Str;
  try {
    const res = await cloudinary.uploader.upload(base64Str, {
      folder,
      resource_type: 'image'
    });
    return res.secure_url;
  } catch (err) {
    console.warn('Advertencia: No se pudo subir imagen a Cloudinary, manteniendo formato original:', err.message);
    return base64Str;
  }
};

// --- CONFIGURACIÓN REDIS ---
const redisClient = redis.createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
redisClient.on('error', (err) => console.error('Redis Client Error', err.message));
redisClient.connect().then(() => console.log('Redis conectado')).catch(err => console.error('Error conectando a Redis', err.message));

const getCacheSafe = async (key) => {
  try {
    if (!redisClient.isOpen) return null;
    return await redisClient.get(key);
  } catch (e) {
    return null;
  }
};

const setCacheSafe = async (key, ttlSeconds, value) => {
  try {
    if (!redisClient.isOpen) return;
    await redisClient.setEx(key, ttlSeconds, value);
  } catch (e) {}
};

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/armario';
const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://localhost:8000';

const connectWithRetry = () => {
  mongoose.connect(MONGO_URI)
    .then(() => console.log('MongoDB conectado'))
    .catch(err => {
      console.error('Error conectando a MongoDB, reintentando en 5 segundos...', err.message);
      setTimeout(connectWithRetry, 5000);
    });
};
connectWithRetry();

const storage = multer.memoryStorage();
const upload = multer({ storage });

const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Acceso denegado' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key');
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Token inválido' });
  }
};

// --- AUTH & ONBOARDING ---
app.post('/api/auth/register', async (req, res) => {
  try {
    const { nombre, email, password, edad } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }

    const existe = await Usuario.findOne({ email });
    if (existe) {
      return res.status(400).json({ error: 'Email ya registrado' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const nuevoUsuario = new Usuario({
      nombre,
      email,
      password: hashedPassword,
      edad: Number(edad) || 25,
      biometria: { estilos: [], genero: '' }
    });

    await nuevoUsuario.save();
    const token = jwt.sign({ id: nuevoUsuario._id }, process.env.JWT_SECRET || 'secret_key', { expiresIn: '24h' });
    res.status(201).json({ token, user: nuevoUsuario });
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ error: 'Error interno en el registro: ' + error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await Usuario.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secret_key', { expiresIn: '24h' });
    res.json({ token, user });
  } catch (error) {
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

// Endpoint de Onboarding (anteriormente faltante)
app.post('/api/auth/onboarding', authMiddleware, async (req, res) => {
  try {
    const { genero, objetivo, estilos } = req.body;
    const user = await Usuario.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    const estilosFormateados = Array.isArray(estilos)
      ? estilos.map(s => String(s).toUpperCase())
      : [];

    user.biometria = {
      ...(user.biometria?.toObject?.() || user.biometria || {}),
      genero: genero || 'Neutra',
      objetivo: objetivo || 'Mejorar estilo personal',
      estilos: estilosFormateados
    };

    await user.save();
    res.json(user.biometria);
  } catch (error) {
    console.error('Error en onboarding:', error);
    res.status(500).json({ error: 'Error al guardar configuración inicial' });
  }
});

app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    const user = await Usuario.findById(req.user.id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener perfil' });
  }
});

// Endpoint para cambiar contraseña
app.put('/api/auth/password', authMiddleware, async (req, res) => {
  try {
    const { passwordActual, passwordNuevo } = req.body;
    if (!passwordActual || !passwordNuevo) {
      return res.status(400).json({ error: 'Debes proporcionar la contraseña actual y la nueva contraseña' });
    }

    if (passwordNuevo.length < 6) {
      return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });
    }

    const user = await Usuario.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    const passwordValido = await bcrypt.compare(passwordActual, user.password);
    if (!passwordValido) {
      return res.status(400).json({ error: 'La contraseña actual no es correcta' });
    }

    const nuevoHash = await bcrypt.hash(passwordNuevo, 10);
    user.password = nuevoHash;
    await user.save();

    res.json({ message: 'Contraseña actualizada con éxito' });
  } catch (error) {
    console.error('Error al cambiar contraseña:', error);
    res.status(500).json({ error: 'Error interno al actualizar contraseña' });
  }
});

app.put('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    const updates = { ...req.body };
    const currentUser = await Usuario.findById(req.user.id);
    if (!currentUser) return res.status(404).json({ error: 'Usuario no encontrado' });

    if (updates.biometria) {
      updates.biometria = {
        ...(currentUser.biometria?.toObject?.() || currentUser.biometria || {}),
        ...updates.biometria
      };
    }

    // 1. Subir foto de perfil general a Cloudinary si viene en Base64
    if (updates.fotoUrl?.startsWith('data:image')) {
      updates.fotoUrl = await subirBase64ACloudinary(updates.fotoUrl, 'armario_ia/avatares');
    }

    // 2. Subir galería de inspiración a Cloudinary si hay elementos en Base64
    if (Array.isArray(updates.galeriaInspiracion)) {
      updates.galeriaInspiracion = await Promise.all(
        updates.galeriaInspiracion.map(img => subirBase64ACloudinary(img, 'armario_ia/inspiracion'))
      );
    }

    // 3. Análisis Facial (Colorimetría 12 estaciones, subtono, forma de cara y tipo de pelo)
    if (updates.fotoCaraUrl?.startsWith('data:image')) {
      const rawFaceBase64 = updates.fotoCaraUrl;
      updates.fotoCaraUrl = await subirBase64ACloudinary(rawFaceBase64, 'armario_ia/biometria');

      try {
        const dataRostro = await styleAI.analizarRostro(updates.fotoCaraUrl || rawFaceBase64);
        if (dataRostro) {
          if (!updates.biometria) {
            updates.biometria = { ...(currentUser.biometria?.toObject?.() || {}) };
          }
          if (dataRostro.colorimetria) updates.biometria.colorimetria = dataRostro.colorimetria;
          if (dataRostro.subtono) updates.biometria.subtono = dataRostro.subtono;
          if (Array.isArray(dataRostro.paletaRecomendada)) updates.biometria.paletaRecomendada = dataRostro.paletaRecomendada;
          if (dataRostro.formaCara) updates.biometria.formaCara = dataRostro.formaCara;
          if (dataRostro.tipoPelo) updates.biometria.tipoPelo = dataRostro.tipoPelo;
        }
      } catch (e) {
        console.error('Error en análisis facial IA:', e.message);
      }
    }

    // 4. Análisis Corporal Híbrido (MediaPipe en Python + IA de Morfología)
    if (updates.fotoCuerpoUrl?.startsWith('data:image')) {
      const rawBodyBase64 = updates.fotoCuerpoUrl;
      updates.fotoCuerpoUrl = await subirBase64ACloudinary(rawBodyBase64, 'armario_ia/biometria');

      let datosMediaPipe = null;
      try {
        const pyRes = await axios.post(`${PYTHON_API_URL}/persona/base64`, {
          image_base64: rawBodyBase64
        }, { timeout: 12000 });
        datosMediaPipe = pyRes.data;
      } catch (pyErr) {
        console.warn('Microservicio MediaPipe no disponible para /persona/base64:', pyErr.message);
      }

      try {
        const dataCuerpo = await styleAI.analizarCuerpo(updates.fotoCuerpoUrl || rawBodyBase64, datosMediaPipe);
        if (dataCuerpo) {
          if (!updates.biometria) {
            updates.biometria = { ...(currentUser.biometria?.toObject?.() || {}) };
          }
          if (dataCuerpo.morfologia) updates.biometria.morfologia = dataCuerpo.morfologia;
          if (dataCuerpo.proporcionVertical) updates.biometria.proporcionVertical = dataCuerpo.proporcionVertical;
          if (dataCuerpo.recomendacionCorte) updates.biometria.recomendacionCorte = dataCuerpo.recomendacionCorte;
        }
      } catch (e) {
        console.error('Error en análisis corporal IA:', e.message);
      }
    }

    const user = await Usuario.findByIdAndUpdate(
      req.user.id,
      { $set: updates },
      { new: true }
    ).select('-password');

    res.json(user);
  } catch (error) {
    console.error('Error actualizando perfil:', error);
    res.status(500).json({ error: 'Error al actualizar el perfil' });
  }
});

// --- TIENDA INTELIGENTE Y LISTA DE DESEOS (SIN LINKS EXTERNOS) ---
app.get('/api/tienda/productos', authMiddleware, async (req, res) => {
  try {
    const user = await Usuario.findById(req.user.id);
    const { categoria = 'Todas', minPrice = 0, maxPrice = 2500, refresh } = req.query;
    const prendas = await Prenda.find({ usuarioId: req.user.id });

    const cacheKey = `tienda:${req.user.id}:${categoria}:${minPrice}:${maxPrice}:${prendas.length}`;
    if (refresh !== 'true') {
      const cached = await getCacheSafe(cacheKey);
      if (cached) {
        return res.json(JSON.parse(cached));
      }
    }

    const productos = await styleAI.recomendarComprasTienda({
      usuario: user,
      prendas,
      categoria,
      minPrice: Number(minPrice) || 0,
      maxPrice: Number(maxPrice) || 2500
    });

    await setCacheSafe(cacheKey, 1800, JSON.stringify(productos));
    res.json(productos);
  } catch (error) {
    console.error('Error en tienda IA:', error);
    res.json([]);
  }
});

// Obtener Lista de Deseos y Compras Registradas del usuario
app.get('/api/tienda/wishlist', authMiddleware, async (req, res) => {
  try {
    const items = await Producto.find({ usuarioId: req.user.id }).sort({ createdAt: -1 });
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener lista de deseos' });
  }
});

// Guardar prenda sugerida en Lista de Deseos
app.post('/api/tienda/wishlist', authMiddleware, async (req, res) => {
  try {
    const { nombre, tipoPrenda, color, marca, precio, precioBase, categoria, img, imageUrl, porque, combinaCon, prioridad } = req.body;
    const precioFinal = Number(precio ?? precioBase) || 0;
    const catFinal = ['Top', 'Bottom', 'Outerwear', 'Shoes', 'Accessories', 'Other'].includes(categoria)
      ? categoria
      : 'Other';

    const existente = await Producto.findOne({
      usuarioId: req.user.id,
      nombre,
      comprado: false
    });
    if (existente) {
      return res.json(existente);
    }

    const nuevoItem = new Producto({
      usuarioId: req.user.id,
      nombre: nombre || 'Prenda recomendada',
      tipoPrenda: tipoPrenda || '',
      color: color || '',
      marca: marca || 'Tiendas recomendadas',
      precioBase: precioFinal,
      categoria: catFinal,
      imageUrl: img || imageUrl || seleccionarFotoCurada(catFinal, nombre, tipoPrenda),
      porque: porque || '',
      combinaCon: Array.isArray(combinaCon) ? combinaCon : [],
      prioridad: prioridad || 'Media',
      comprado: false
    });

    await nuevoItem.save();
    res.status(201).json(nuevoItem);
  } catch (error) {
    console.error('Error guardando en wishlist:', error);
    res.status(500).json({ error: 'Error al guardar en lista de deseos' });
  }
});

// Eliminar item de Lista de Deseos
app.delete('/api/tienda/wishlist/:id', authMiddleware, async (req, res) => {
  try {
    await Producto.findOneAndDelete({ _id: req.params.id, usuarioId: req.user.id });
    res.json({ message: 'Eliminado de tu lista de deseos' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar de lista de deseos' });
  }
});

// Registrar compra (actualiza presupuesto gastado, marca en wishlist y opcionalmente añade al armario)
app.post('/api/tienda/comprar', authMiddleware, async (req, res) => {
  try {
    const {
      productoId,
      nombre,
      tipoPrenda,
      color,
      marca,
      precio,
      categoria,
      img,
      porque,
      combinaCon,
      agregarAlArmario = true
    } = req.body;

    const montoCompra = Math.max(0, Number(precio) || 0);
    const catValida = ['Top', 'Bottom', 'Outerwear', 'Shoes', 'Accessories', 'Other'].includes(categoria)
      ? categoria
      : 'Other';
    const fotoUrl = img || seleccionarFotoCurada(catValida, nombre, tipoPrenda);

    // 1. Actualizar monto gastado del usuario
    const userActualizado = await Usuario.findByIdAndUpdate(
      req.user.id,
      { $inc: { gastado: montoCompra } },
      { new: true }
    ).select('-password');

    // 2. Actualizar o crear registro en Producto
    let productoDoc = null;
    if (productoId) {
      productoDoc = await Producto.findOneAndUpdate(
        { _id: productoId, usuarioId: req.user.id },
        { $set: { comprado: true, fechaCompra: new Date(), precioBase: montoCompra } },
        { new: true }
      );
    }
    if (!productoDoc) {
      productoDoc = new Producto({
        usuarioId: req.user.id,
        nombre: nombre || 'Nueva prenda adquirida',
        tipoPrenda: tipoPrenda || '',
        color: color || '',
        marca: marca || '',
        precioBase: montoCompra,
        categoria: catValida,
        imageUrl: fotoUrl,
        porque: porque || '',
        combinaCon: Array.isArray(combinaCon) ? combinaCon : [],
        comprado: true,
        fechaCompra: new Date()
      });
      await productoDoc.save();
    }

    // 3. Si el usuario lo desea, registrar la prenda directamente en su Armario Digital
    let prendaCreada = null;
    if (agregarAlArmario) {
      prendaCreada = new Prenda({
        usuarioId: req.user.id,
        nombre: nombre || 'Prenda adquirida',
        categoria: catValida,
        url_imagen_limpia: fotoUrl,
        descripcion: porque || `Adquirida sugerida para combinar con ${(combinaCon || []).join(', ')}`,
        color_principal: color || 'Neutro',
        material: 'Seleccionado en tienda',
        corte_silueta: tipoPrenda || 'Regular',
        estilo: 'Smart Casual',
        tags_ia: ['compra_boutique', ...(marca ? [marca] : [])]
      });
      await prendaCreada.save();
    }

    res.status(201).json({
      user: userActualizado,
      gastado: userActualizado.gastado,
      presupuesto: userActualizado.presupuesto,
      producto: productoDoc,
      prendaCreada
    });
  } catch (error) {
    console.error('Error registrando compra:', error);
    res.status(500).json({ error: 'Error al registrar la compra' });
  }
});

app.put('/api/usuario/presupuesto', authMiddleware, async (req, res) => {
  try {
    const { presupuesto, gastado } = req.body;
    const updateFields = {};
    if (presupuesto !== undefined) updateFields.presupuesto = Number(presupuesto);
    if (gastado !== undefined) updateFields.gastado = Math.max(0, Number(gastado));

    const user = await Usuario.findByIdAndUpdate(req.user.id, { $set: updateFields }, { new: true });
    res.json({ presupuesto: user.presupuesto, gastado: user.gastado });
  } catch (e) {
    res.status(500).json({ error: 'Error al actualizar presupuesto' });
  }
});

// --- PRENDAS ---
app.post('/api/prendas', authMiddleware, upload.single('imagen'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Imagen requerida' });
    const { nombre, categoria } = req.body;

    let finalImgUrl = null;
    let colorAnalisisPython = {};
    let descripcionPython = '';

    // 1. Intentar segmentación y análisis con microservicio Python
    try {
      const formData = new FormData();
      formData.append('file', req.file.buffer, { filename: req.file.originalname });
      if (categoria) formData.append('categoria', categoria);

      const pythonRes = await axios.post(`${PYTHON_API_URL}/prenda`, formData, {
        headers: { ...formData.getHeaders() },
        timeout: 25000
      });

      const cleanedImg = pythonRes.data.image_base64;
      colorAnalisisPython = pythonRes.data.analisis || {};
      descripcionPython = pythonRes.data.descripcion || '';
      const finalImgBase64 = cleanedImg.startsWith('data:') ? cleanedImg : `data:image/png;base64,${cleanedImg}`;

      const uploadRes = await cloudinary.uploader.upload(finalImgBase64, {
        folder: 'armario_ia/prendas',
        resource_type: 'image'
      });
      finalImgUrl = uploadRes.secure_url;
    } catch (pyErr) {
      console.warn('Aviso: microservicio Python no respondió o falló segmentación:', pyErr.message);
    }

    // 2. Respaldo directo: si falló Python o no hay URL limpia, subir imagen original a Cloudinary
    if (!finalImgUrl) {
      console.log('Subiendo imagen original como respaldo a Cloudinary...');
      const rawBase64 = `data:${req.file.mimetype || 'image/jpeg'};base64,${req.file.buffer.toString('base64')}`;
      const uploadRes = await cloudinary.uploader.upload(rawBase64, {
        folder: 'armario_ia/prendas',
        resource_type: 'image'
      });
      finalImgUrl = uploadRes.secure_url;
    }

    // 3. Etiquetado inteligente con IA + datos de la prenda
    const data = await styleAI.etiquetarPrenda(finalImgUrl, colorAnalisisPython);

    const nueva = new Prenda({
      usuarioId: req.user.id,
      nombre: nombre || data.nombre || 'Prenda IA',
      categoria: categoria || data.categoria || 'Other',
      url_imagen_limpia: finalImgUrl,
      descripcion: data.descripcion || descripcionPython || 'Prenda registrada en tu colección personal.',
      color_principal: data.color || 'Neutro',
      color_hex: data.color_hex || colorAnalisisPython.color_hex || '#222222',
      subtono: data.subtono || colorAnalisisPython.subtono || 'Neutro',
      material: data.material || 'Algodón / Mezcla',
      corte_silueta: data.corte_silueta || 'Regular',
      estilo: data.estilo || 'Casual',
      temporada: data.temporada || 'Todo el año',
      formalidad: Number(data.formalidad) || 3,
      tags_ia: Array.isArray(data.tags) ? data.tags : []
    });
    await nueva.save();
    res.status(201).json(nueva);
  } catch (e) {
    console.error('Error prendas:', e);
    res.status(500).json({ error: 'Error al procesar prenda' });
  }
});

app.get('/api/prendas', authMiddleware, async (req, res) => {
  const p = await Prenda.find({ usuarioId: req.user.id }).sort({ created_at: -1 });
  res.json(p);
});

app.put('/api/prendas/:id', authMiddleware, async (req, res) => {
  const p = await Prenda.findOneAndUpdate({ _id: req.params.id, usuarioId: req.user.id }, req.body, { new: true });
  res.json(p);
});

app.delete('/api/prendas/:id', authMiddleware, async (req, res) => {
  await Prenda.findOneAndDelete({ _id: req.params.id, usuarioId: req.user.id });
  res.json({ message: 'Eliminada' });
});

// --- ACTUALIZAR IMAGEN DE PRENDA ---
app.put('/api/prendas/:id/imagen', authMiddleware, upload.single('imagen'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Imagen no proporcionada' });

    let finalImgUrl = null;
    let colorAnalisisPython = {};

    try {
      const formData = new FormData();
      formData.append('file', req.file.buffer, { filename: req.file.originalname });

      const pythonRes = await axios.post(`${PYTHON_API_URL}/prenda`, formData, {
        headers: { ...formData.getHeaders() },
        timeout: 25000
      });
      const cleanedImg = pythonRes.data.image_base64;
      colorAnalisisPython = pythonRes.data.analisis || {};
      const finalImgBase64 = cleanedImg.startsWith('data:') ? cleanedImg : `data:image/png;base64,${cleanedImg}`;

      const uploadRes = await cloudinary.uploader.upload(finalImgBase64, {
        folder: 'armario_ia/prendas',
        resource_type: 'image'
      });
      finalImgUrl = uploadRes.secure_url;
    } catch (pyErr) {
      console.warn('Aviso: microservicio Python no respondió al actualizar imagen:', pyErr.message);
    }

    if (!finalImgUrl) {
      const rawBase64 = `data:${req.file.mimetype || 'image/jpeg'};base64,${req.file.buffer.toString('base64')}`;
      const uploadRes = await cloudinary.uploader.upload(rawBase64, {
        folder: 'armario_ia/prendas',
        resource_type: 'image'
      });
      finalImgUrl = uploadRes.secure_url;
    }

    const updateData = {
      url_imagen_limpia: finalImgUrl,
      color_hex: colorAnalisisPython.color_hex || '#222222',
      subtono: colorAnalisisPython.subtono || 'Neutro'
    };

    const prendaActualizada = await Prenda.findOneAndUpdate(
      { _id: req.params.id, usuarioId: req.user.id },
      { $set: updateData },
      { new: true }
    );

    if (!prendaActualizada) return res.status(404).json({ error: 'Prenda no encontrada' });
    res.json(prendaActualizada);
  } catch (e) {
    console.error('Error al actualizar imagen:', e);
    res.status(500).json({ error: 'Error al procesar la nueva imagen' });
  }
});

// --- LOOKS (GENERADOR CON TRIPLE NIVEL DE RESPALDO Y FEEDBACK LOOP) ---
app.post('/api/looks/generate', authMiddleware, async (req, res) => {
  try {
    const { ocasion = 'Casual', forzarRegenerar, clima, instrucciones } = req.body;
    const user = await Usuario.findById(req.user.id);
    const prendas = await Prenda.find({ usuarioId: req.user.id });

    if (prendas.length === 0) {
      return res.json({
        outfit: [],
        explicacion: 'Aún no tienes prendas registradas en tu armario digital. Añade tus primeras prendas para generar looks personalizados.',
        consejo_color: 'Comienza subiendo al menos una prenda superior y una inferior.',
        score: { color: 0, balance: 0 },
        origen: 'vacio'
      });
    }

    const feedbackCount = (user.biometria?.preferenciasFeedback || []).length;
    const cacheKey = `look:${req.user.id}:${ocasion}:${prendas.length}:${user.biometria?.morfologia}:${user.biometria?.colorimetria}:${clima || 'none'}:${instrucciones || ''}:${feedbackCount}`;

    if (!forzarRegenerar) {
      const cachedLook = await getCacheSafe(cacheKey);
      if (cachedLook) {
        return res.json(JSON.parse(cachedLook));
      }
    }

    // Obtener looks que al usuario ya le gustaron para el Nivel 3 de respaldo
    const looksFavoritos = await Look.find({
      usuarioId: req.user.id,
      liked: { $ne: false }
    })
      .populate({ path: 'prendas', model: 'Prenda' })
      .sort({ createdAt: -1 })
      .limit(15);

    const data = await styleAI.generarOutfit({
      usuario: user,
      prendas,
      ocasion,
      clima,
      instrucciones,
      looksFavoritos
    });

    let outfit = await Prenda.find({ _id: { $in: data.ids }, usuarioId: req.user.id });
    if (outfit.length === 0 && prendas.length > 0) {
      outfit = prendas.slice(0, Math.min(3, prendas.length));
    }

    const responseData = {
      outfit,
      explicacion: data.explicacion,
      consejo_color: data.consejo_color,
      score: { color: data.score_color || 88, balance: data.score_balance || 90 },
      origen: data.origen || 'ia'
    };

    if (data.origen === 'ia') {
      await setCacheSafe(cacheKey, 3600, JSON.stringify(responseData));
    }

    res.json(responseData);
  } catch (e) {
    console.error('Error generador:', e);
    res.status(500).json({ error: 'Error al generar look' });
  }
});

app.post('/api/looks/analyze', authMiddleware, async (req, res) => {
  try {
    const { prendasIds, ocasion, clima } = req.body;
    const user = await Usuario.findById(req.user.id);
    const prendasSeleccionadas = await Prenda.find({ _id: { $in: prendasIds }, usuarioId: req.user.id });
    const todasLasPrendas = await Prenda.find({ usuarioId: req.user.id });

    const data = await styleAI.analizarCombinacionManual({
      usuario: user,
      prendasSeleccionadas,
      todasLasPrendas,
      ocasion,
      clima
    });

    let prendaRespaldo = null;
    if (data.sugerencia_reemplazo?.id_sugerida) {
      prendaRespaldo = await Prenda.findById(data.sugerencia_reemplazo.id_sugerida);
    }

    res.json({
      feedback: data.feedback,
      consejo_color: data.consejo_color,
      score: { color: data.score_color || 85, balance: data.score_balance || 85 },
      sugerencia: data.sugerencia_reemplazo && prendaRespaldo ? {
        ...data.sugerencia_reemplazo,
        prendaDetalle: prendaRespaldo
      } : null
    });
  } catch (e) {
    console.error('Error análisis:', e);
    res.status(500).json({ error: 'Error al analizar el look' });
  }
});

// Feedback Loop: aprende de los "Me gusta" y "No me gusta" (y guarda los looks con "Me gusta" para respaldo futuro)
app.post('/api/looks/feedback', authMiddleware, async (req, res) => {
  try {
    const { type, prendasIds = [], motivo = '', detalle = '', ocasion = 'Casual', explicacion = '', consejo_color = '', score } = req.body;

    if (type === 'like') {
      await Usuario.findByIdAndUpdate(req.user.id, {
        $addToSet: { 'biometria.likes': { $each: prendasIds.map(String) } }
      });

      // Guardar también como Look validado que le gustó al usuario (sirve además como respaldo Nivel 3 si falla la IA)
      if (prendasIds.length > 0) {
        const yaExiste = await Look.findOne({
          usuarioId: req.user.id,
          prendas: { $all: prendasIds, $size: prendasIds.length }
        });
        if (!yaExiste) {
          const nuevoLookGustado = new Look({
            usuarioId: req.user.id,
            prendas: prendasIds,
            ocasion: ocasion || 'Casual',
            explicacion: explicacion || 'Combinación validada con Me Gusta por el usuario.',
            consejo_color: consejo_color || '',
            score: score || { color: 90, balance: 90 },
            liked: true
          });
          await nuevoLookGustado.save();
        }
      }
    } else if (type === 'dislike') {
      const prendasRechazadas = await Prenda.find({ _id: { $in: prendasIds } });
      const nombres = prendasRechazadas.map(p => p.nombre).join(', ');
      let reglaAprendida = '';

      if (motivo === 'color') {
        reglaAprendida = `Evitar combinar simultáneamente los tonos de [${nombres}] (${detalle || 'preferencia cromática del usuario'})`;
      } else if (motivo === 'corte') {
        reglaAprendida = `Evitar la proporción de cortes de [${nombres}] (${detalle || 'ajustar equilibrio de silueta'})`;
      } else {
        reglaAprendida = `Para ocasión ${ocasion}, evitar el estilo de [${nombres}] (${detalle || 'preferencia de estilo'})`;
      }

      await Usuario.findByIdAndUpdate(req.user.id, {
        $push: {
          'biometria.dislikes': {
            prendasIds: prendasIds.map(String),
            motivo: motivo || 'estilo',
            detalle: detalle || '',
            fecha: new Date()
          },
          'biometria.preferenciasFeedback': {
            $each: [reglaAprendida],
            $slice: -15 // Mantener las 15 reglas más recientes
          }
        }
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error al procesar feedback:', error);
    res.status(500).json({ error: 'Error al procesar feedback' });
  }
});

app.post('/api/looks/save', authMiddleware, async (req, res) => {
  try {
    const { prendasIds, ocasion, explicacion, consejo_color, score } = req.body;
    if (!Array.isArray(prendasIds) || prendasIds.length === 0) {
      return res.status(400).json({ error: 'Debes incluir al menos una prenda en el look' });
    }
    const nuevo = new Look({
      usuarioId: req.user.id,
      prendas: prendasIds,
      ocasion: ocasion || 'Casual',
      explicacion: explicacion || 'Look personalizado guardado en favoritos.',
      consejo_color: consejo_color || '',
      score: score || { color: 88, balance: 88 },
      liked: true
    });
    await nuevo.save();
    res.status(201).json(nuevo);
  } catch (error) {
    res.status(500).json({ error: 'Error al guardar favorito' });
  }
});

app.get('/api/looks/saved', authMiddleware, async (req, res) => {
  try {
    const looks = await Look.find({ usuarioId: req.user.id })
      .populate({ path: 'prendas', model: 'Prenda' })
      .sort({ createdAt: -1 });
    res.json(looks);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener favoritos' });
  }
});

app.delete('/api/looks/:id', authMiddleware, async (req, res) => {
  await Look.findOneAndDelete({ _id: req.params.id, usuarioId: req.user.id });
  res.json({ message: 'Eliminado' });
});

// --- HISTORIAL DE USO ---
app.post('/api/uso', authMiddleware, async (req, res) => {
  try {
    const { prendasIds, lookId, fecha } = req.body;
    if (!Array.isArray(prendasIds) || prendasIds.length === 0) {
      return res.status(400).json({ error: 'Se requieren prendas para registrar el uso' });
    }
    const nuevoUso = new Uso({
      usuarioId: req.user.id,
      prendas: prendasIds,
      lookId: lookId || null,
      fecha: fecha || new Date()
    });
    await nuevoUso.save();

    await Prenda.updateMany(
      { _id: { $in: prendasIds }, usuarioId: req.user.id },
      {
        $inc: { contadorUsos: 1 },
        $set: { ultimoUso: fecha || new Date() }
      }
    );

    res.status(201).json(nuevoUso);
  } catch (error) {
    res.status(500).json({ error: 'Error al registrar uso' });
  }
});

app.get('/api/uso/estadisticas', authMiddleware, async (req, res) => {
  try {
    const masUsadas = await Prenda.find({ usuarioId: req.user.id, contadorUsos: { $gt: 0 } }).sort({ contadorUsos: -1 }).limit(5);
    const menosUsadas = await Prenda.find({ usuarioId: req.user.id }).sort({ contadorUsos: 1 }).limit(5);
    const nuncaUsadas = await Prenda.find({ usuarioId: req.user.id, contadorUsos: 0 }).limit(10);
    const totalUsos = await Uso.countDocuments({ usuarioId: req.user.id });

    res.json({ masUsadas, menosUsadas, nuncaUsadas, totalUsos });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

// --- CHATBOT CON HISTORIAL ---
app.get('/api/chat/sessions', authMiddleware, async (req, res) => {
  try {
    const sessions = await ChatSession.find({ usuarioId: req.user.id })
      .select('titulo updatedAt createdAt')
      .sort({ updatedAt: -1 });
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener sesiones' });
  }
});

app.get('/api/chat/sessions/:id', authMiddleware, async (req, res) => {
  try {
    const session = await ChatSession.findOne({ _id: req.params.id, usuarioId: req.user.id });
    if (!session) return res.status(404).json({ error: 'Sesión no encontrada' });
    res.json(session);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener sesión' });
  }
});

app.post('/api/chat', authMiddleware, async (req, res) => {
  try {
    const { mensaje, sessionId } = req.body;
    const user = await Usuario.findById(req.user.id);
    const prendas = await Prenda.find({ usuarioId: req.user.id });

    let session;
    if (sessionId) {
      session = await ChatSession.findOne({ _id: sessionId, usuarioId: req.user.id });
    }

    if (!session) {
      session = new ChatSession({
        usuarioId: req.user.id,
        titulo: mensaje.substring(0, 30) + (mensaje.length > 30 ? '...' : ''),
        mensajes: []
      });
    }

    const historialContexto = session.mensajes.slice(-6).map(m => ({
      role: m.role,
      content: m.content
    }));

    const respuestaText = await styleAI.chatAsesor({
      usuario: user,
      prendas,
      historial: historialContexto,
      mensaje
    });

    session.mensajes.push({ role: 'user', content: mensaje });
    session.mensajes.push({ role: 'assistant', content: respuestaText });
    session.updatedAt = new Date();

    await session.save();

    res.json({
      respuesta: respuestaText,
      sessionId: session._id,
      titulo: session.titulo
    });
  } catch (error) {
    console.error('Error chat:', error);
    res.status(500).json({ error: 'Error en el chat' });
  }
});

app.delete('/api/chat/sessions/:id', authMiddleware, async (req, res) => {
  try {
    await ChatSession.findOneAndDelete({ _id: req.params.id, usuarioId: req.user.id });
    res.json({ message: 'Sesión eliminada' });
  } catch (error) {
    res.status(500).json({ error: 'Error' });
  }
});

app.listen(PORT, () => console.log(`Servidor Node IA (Gemini 3.8 Flash + OpenRouter Fallback + Armario Sync) corriendo en ${PORT}`));
