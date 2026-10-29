/**
 * Rutas modulares de extensión del armario digital:
 * - Importador Web (preview + extracción + recorte rembg + etiquetado IA) y Catálogo de Básicos.
 * - Calendario OOTD (registro diario y planificación futura) + Analítica de Clóset.
 */

const express = require('express');
const axios = require('axios');
const FormData = require('form-data');
const Prenda = require('../models/Prenda');
const Uso = require('../models/Uso');
const { CATALOGO_BASICOS, buscarBasicosPorSlugs } = require('../services/catalogoBasicos');
const { extraerImagenDesdeUrl } = require('../services/webImporter');
const {
  obtenerFechaDiaLocal,
  recalcularUsosUsuario,
  calcularAnaliticaCloset
} = require('../services/analyticsService');

function parsearOcasiones(rawOcasiones, fallback = ['Casual']) {
  if (Array.isArray(rawOcasiones)) {
    const clean = rawOcasiones.map((o) => String(o).trim()).filter(Boolean);
    return clean.length > 0 ? clean : fallback;
  }
  if (typeof rawOcasiones === 'string' && rawOcasiones.trim()) {
    try {
      const parsed = JSON.parse(rawOcasiones);
      if (Array.isArray(parsed)) {
        const clean = parsed.map((o) => String(o).trim()).filter(Boolean);
        return clean.length > 0 ? clean : fallback;
      }
    } catch (e) {
      const split = rawOcasiones.split(',').map((o) => o.trim()).filter(Boolean);
      if (split.length > 0) return split;
    }
  }
  return fallback;
}

function esFechaDiaValida(str) {
  return typeof str === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(str);
}

function createArmarioRouter({ authMiddleware, cloudinary, pythonApiUrl, styleAI, upload }) {
  const router = express.Router();
  const optionalSingleUpload = upload
    ? (req, res, next) => {
        const contentType = req.headers['content-type'] || '';
        if (contentType.includes('multipart/form-data')) {
          return upload.single('imagen')(req, res, next);
        }
        return next();
      }
    : (req, res, next) => next();

  // =========================================================================
  // MÓDULO B (Vía 4): CATÁLOGO DE BÁSICOS (1 CLIC DIRECTO DESDE basicos_seed.json)
  // =========================================================================
  router.get('/prendas/catalogo-basicos', authMiddleware, async (req, res) => {
    res.json(CATALOGO_BASICOS);
  });

  router.post('/prendas/basicos', authMiddleware, async (req, res) => {
    try {
      const { slug, slugs, basicIds } = req.body;
      const solicitados = [
        ...(slug ? [slug] : []),
        ...(Array.isArray(slugs) ? slugs : []),
        ...(Array.isArray(basicIds) ? basicIds : [])
      ];

      if (solicitados.length === 0) {
        return res.status(400).json({ error: 'Indica el slug o lista de prendas básicas a insertar.' });
      }

      const seleccionadas = buscarBasicosPorSlugs(solicitados);
      if (seleccionadas.length === 0) {
        return res.status(404).json({ error: 'No se encontró la prenda básica solicitada en basicos_seed.json.' });
      }

      // Inserción directa sin pasar por rembg ni IA para máxima velocidad y normalización fija
      const creadas = [];
      for (const item of seleccionadas) {
        const doc = new Prenda({
          usuarioId: req.user.id,
          nombre: item.nombre,
          marca: item.marca || 'Esenciales',
          categoria: item.categoria,
          url_imagen_original: item.url_imagen_limpia,
          url_imagen_limpia: item.url_imagen_limpia,
          color_principal: item.color_principal,
          color_hex: item.color_hex,
          color_secundario: item.color_secundario || '',
          color_secundario_hex: item.color_secundario_hex || '',
          subtono: item.subtono || 'Neutro',
          tono_estacional: item.tono_estacional || 'Neutro',
          material: item.material || 'Algodón',
          corte_silueta: item.corte_silueta || 'Regular',
          estilo: item.estilo || 'Casual',
          temporada: item.temporada || 'Todo el año',
          ocasiones: item.ocasiones || ['Casual'],
          origen_carga: item.origen_carga || 'basicos',
          formalidad: item.formalidad || 3,
          tags_ia: item.tags_ia || [],
          descripcion: item.descripcion || 'Prenda esencial de fondo de armario.'
        });
        await doc.save();
        creadas.push(doc);
      }

      res.status(201).json({
        prenda: creadas[0],
        creadas,
        total: creadas.length
      });
    } catch (error) {
      console.error('Error agregando básicos:', error);
      res.status(500).json({ error: 'No se pudieron añadir las prendas básicas.' });
    }
  });

  // =========================================================================
  // PIPELINE EN DOS PASOS CON TIMEOUT AMPLIO (>= 30s) Y RESPUESTA TRANSITORIA
  // Paso 1: Extracción (archivo local o URL) + Remoción de fondo (rembg)
  // Paso 2: Etiquetado estilístico con IA + Persistencia normalizada
  // =========================================================================
  router.post('/prendas/procesar-vision', authMiddleware, optionalSingleUpload, async (req, res) => {
    req.setTimeout(60000);
    res.setTimeout(60000);

    try {
      const { url, categoria } = req.body || {};
      let imageBuffer = null;
      let mimeType = 'image/jpeg';
      let originalFilename = 'prenda.jpg';
      let urlOriginal = '';
      let tituloSugerido = '';
      let marcaSugerida = '';

      if (req.file && req.file.buffer) {
        imageBuffer = req.file.buffer;
        mimeType = req.file.mimetype || 'image/jpeg';
        originalFilename = req.file.originalname || 'captura.jpg';
      } else if (url && String(url).trim()) {
        const extraida = await extraerImagenDesdeUrl(url);
        imageBuffer = extraida.buffer;
        mimeType = extraida.mimeType || 'image/jpeg';
        const ext = mimeType.includes('png') ? 'png' : 'jpg';
        originalFilename = `web_import.${ext}`;
        urlOriginal = extraida.imageUrlDetectada || String(url).trim();
        tituloSugerido = extraida.tituloSugerido || '';
        marcaSugerida = extraida.marcaSugerida || '';
      } else {
        return res.status(400).json({ error: 'Proporciona una imagen o una URL válida para procesar.' });
      }

      let finalImgUrl = null;
      let colorAnalisisPython = {};
      let descripcionPython = '';

      // Remoción de fondo con microservicio Python (timeout amplio de 35s >= 30s requerido)
      try {
        const formData = new FormData();
        formData.append('file', imageBuffer, {
          filename: originalFilename,
          contentType: mimeType
        });
        if (categoria) formData.append('categoria', categoria);

        const pythonRes = await axios.post(`${pythonApiUrl}/prenda`, formData, {
          headers: { ...formData.getHeaders() },
          timeout: 35000
        });

        const cleanedImg = pythonRes.data.image_base64;
        colorAnalisisPython = pythonRes.data.analisis || {};
        descripcionPython = pythonRes.data.descripcion || '';
        const finalImgBase64 = cleanedImg.startsWith('data:')
          ? cleanedImg
          : `data:image/png;base64,${cleanedImg}`;

        const uploadRes = await cloudinary.uploader.upload(finalImgBase64, {
          folder: 'armario_ia/prendas',
          resource_type: 'image'
        });
        finalImgUrl = uploadRes.secure_url;
      } catch (pyErr) {
        console.warn('Aviso: segmentación Python omitida en procesar-vision:', pyErr.message);
      }

      if (!finalImgUrl) {
        const rawBase64 = `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
        const uploadRes = await cloudinary.uploader.upload(rawBase64, {
          folder: 'armario_ia/prendas',
          resource_type: 'image'
        });
        finalImgUrl = uploadRes.secure_url;
      }

      res.json({
        step: 'vision_completada',
        status: 'ready_for_ai',
        message: 'Fondo removido y recorte limpio generado. Listo para análisis de estilo con IA.',
        url_imagen_limpia: finalImgUrl,
        url_imagen_original: urlOriginal || finalImgUrl,
        analisis: colorAnalisisPython,
        descripcionPython,
        tituloSugerido,
        marcaSugerida
      });
    } catch (error) {
      console.error('Error en paso 1 (procesar-vision):', error.message);
      res.status(400).json({ error: error.message || 'No fue posible procesar la imagen de la prenda.' });
    }
  });

  router.post('/prendas/finalizar-ia', authMiddleware, async (req, res) => {
    req.setTimeout(60000);
    res.setTimeout(60000);

    try {
      const {
        url_imagen_limpia,
        url_imagen_original,
        analisis = {},
        descripcionPython = '',
        tituloSugerido = '',
        marcaSugerida = '',
        nombre,
        marca,
        categoria,
        color_principal,
        color_hex,
        color_secundario,
        color_secundario_hex,
        subtono,
        tono_estacional,
        material,
        temporada,
        ocasiones,
        origen_carga
      } = req.body || {};

      if (!url_imagen_limpia) {
        return res.status(400).json({ error: 'Se requiere url_imagen_limpia generada en el paso de visión.' });
      }

      const dataIA = await styleAI.etiquetarPrenda(url_imagen_limpia, analisis);
      const origenValido = ['camara', 'galeria', 'web', 'basicos'].includes(origen_carga)
        ? origen_carga
        : 'galeria';

      const nueva = new Prenda({
        usuarioId: req.user.id,
        nombre: (nombre && String(nombre).trim()) || tituloSugerido || dataIA.nombre || 'Prenda Digitalizada',
        marca: (marca && String(marca).trim()) || marcaSugerida || dataIA.marca || 'Sin Marca',
        categoria: categoria || dataIA.categoria || 'Top',
        url_imagen_original: url_imagen_original || url_imagen_limpia,
        url_imagen_limpia,
        descripcion: dataIA.descripcion || descripcionPython || 'Prenda registrada en tu colección personal.',
        color_principal: (color_principal && String(color_principal).trim()) || dataIA.color || 'Neutro',
        color_hex: color_hex || dataIA.color_hex || analisis.color_hex || '#222222',
        color_secundario: color_secundario !== undefined ? color_secundario : (dataIA.color_secundario || ''),
        color_secundario_hex: color_secundario_hex !== undefined ? color_secundario_hex : (dataIA.color_secundario_hex || ''),
        subtono: subtono || dataIA.subtono || analisis.subtono || 'Neutro',
        tono_estacional: tono_estacional || dataIA.tono_estacional || subtono || dataIA.subtono || 'Neutro',
        material: (material && String(material).trim()) || dataIA.material || 'Algodón / Mezcla',
        corte_silueta: dataIA.corte_silueta || 'Regular',
        estilo: dataIA.estilo || 'Casual',
        temporada: temporada || dataIA.temporada || 'Todo el año',
        ocasiones: parsearOcasiones(ocasiones, dataIA.ocasiones || ['Casual']),
        origen_carga: origenValido,
        formalidad: Number(dataIA.formalidad) || 3,
        tags_ia: Array.isArray(dataIA.tags) ? dataIA.tags : []
      });

      await nueva.save();
      res.status(201).json(nueva);
    } catch (error) {
      console.error('Error en paso 2 (finalizar-ia):', error.message);
      res.status(500).json({ error: error.message || 'Error al analizar estilo con IA y guardar la prenda.' });
    }
  });

  // =========================================================================
  // MÓDULO B (Vía 3): IMPORTADOR WEB POR URL DIRECTA O FICHA DE TIENDA
  // =========================================================================
  router.post('/prendas/preview-url', authMiddleware, async (req, res) => {
    try {
      const { url } = req.body;
      const extraida = await extraerImagenDesdeUrl(url);
      res.json({
        imageUrl: extraida.imageUrlDetectada,
        tituloSugerido: extraida.tituloSugerido,
        marcaSugerida: extraida.marcaSugerida
      });
    } catch (error) {
      res.status(400).json({ error: error.message || 'No fue posible extraer la imagen desde el enlace.' });
    }
  });

  router.post('/prendas/import-url', authMiddleware, async (req, res) => {
    req.setTimeout(60000);
    res.setTimeout(60000);
    try {
      const {
        url,
        nombre,
        marca,
        categoria,
        color_principal,
        color_hex,
        color_secundario,
        color_secundario_hex,
        tono_estacional,
        material,
        temporada,
        ocasiones
      } = req.body;

      const extraida = await extraerImagenDesdeUrl(url);
      let finalImgUrl = null;
      let colorAnalisisPython = {};
      let descripcionPython = '';

      // 1. Segmentación y recorte de fondo con microservicio Python (rembg)
      try {
        const ext = extraida.mimeType.includes('png') ? 'png' : 'jpg';
        const formData = new FormData();
        formData.append('file', extraida.buffer, {
          filename: `web_import.${ext}`,
          contentType: extraida.mimeType
        });
        if (categoria) formData.append('categoria', categoria);

        const pythonRes = await axios.post(`${pythonApiUrl}/prenda`, formData, {
          headers: { ...formData.getHeaders() },
          timeout: 35000
        });

        const cleanedImg = pythonRes.data.image_base64;
        colorAnalisisPython = pythonRes.data.analisis || {};
        descripcionPython = pythonRes.data.descripcion || '';
        const finalImgBase64 = cleanedImg.startsWith('data:')
          ? cleanedImg
          : `data:image/png;base64,${cleanedImg}`;

        const uploadRes = await cloudinary.uploader.upload(finalImgBase64, {
          folder: 'armario_ia/prendas',
          resource_type: 'image'
        });
        finalImgUrl = uploadRes.secure_url;
      } catch (pyErr) {
        console.warn('Aviso: segmentación Python omitida en import-url:', pyErr.message);
      }

      // 2. Respaldo directo en Cloudinary si Python no devolvió recorte
      if (!finalImgUrl) {
        const rawBase64 = `data:${extraida.mimeType};base64,${extraida.buffer.toString('base64')}`;
        const uploadRes = await cloudinary.uploader.upload(rawBase64, {
          folder: 'armario_ia/prendas',
          resource_type: 'image'
        });
        finalImgUrl = uploadRes.secure_url;
      }

      // 3. Etiquetado IA enriquecido
      const dataIA = await styleAI.etiquetarPrenda(finalImgUrl, colorAnalisisPython);

      const nueva = new Prenda({
        usuarioId: req.user.id,
        nombre: (nombre && nombre.trim()) || extraida.tituloSugerido || dataIA.nombre || 'Prenda Importada',
        marca: (marca && marca.trim()) || extraida.marcaSugerida || dataIA.marca || 'Sin marca',
        categoria: categoria || dataIA.categoria || 'Top',
        url_imagen_original: extraida.imageUrlDetectada,
        url_imagen_limpia: finalImgUrl,
        descripcion: dataIA.descripcion || descripcionPython || 'Prenda importada desde la web.',
        color_principal: (color_principal && color_principal.trim()) || dataIA.color || 'Neutro',
        color_hex: color_hex || dataIA.color_hex || colorAnalisisPython.color_hex || '#222222',
        color_secundario: color_secundario !== undefined ? color_secundario : (dataIA.color_secundario || ''),
        color_secundario_hex: color_secundario_hex !== undefined ? color_secundario_hex : (dataIA.color_secundario_hex || ''),
        subtono: dataIA.subtono || colorAnalisisPython.subtono || 'Neutro',
        tono_estacional: tono_estacional || dataIA.tono_estacional || dataIA.subtono || 'Neutro',
        material: (material && material.trim()) || dataIA.material || 'Algodón / Mezcla',
        corte_silueta: dataIA.corte_silueta || 'Regular',
        estilo: dataIA.estilo || 'Casual',
        temporada: temporada || dataIA.temporada || 'Todo el año',
        ocasiones: parsearOcasiones(ocasiones, dataIA.ocasiones || ['Casual']),
        origen_carga: 'web',
        formalidad: Number(dataIA.formalidad) || 3,
        tags_ia: Array.isArray(dataIA.tags) ? dataIA.tags : []
      });

      await nueva.save();
      res.status(201).json(nueva);
    } catch (error) {
      console.error('Error importando prenda desde URL:', error.message);
      res.status(400).json({ error: error.message || 'Error al importar la prenda desde la URL.' });
    }
  });

  // =========================================================================
  // MÓDULO A y D: CALENDARIO OOTD (REGISTRO DIARIO Y PLANIFICACIÓN)
  // =========================================================================
  router.get('/calendario', authMiddleware, async (req, res) => {
    try {
      const { mes, desde, hasta } = req.query;
      const filtro = { usuarioId: req.user.id };

      if (mes && /^\d{4}-\d{2}$/.test(String(mes))) {
        filtro.fechaDia = { $regex: `^${mes}` };
      } else if (esFechaDiaValida(desde) && esFechaDiaValida(hasta)) {
        filtro.fechaDia = { $gte: desde, $lte: hasta };
      }

      const registros = await Uso.find(filtro)
        .populate({ path: 'prendas', model: 'Prenda' })
        .populate({ path: 'lookId', model: 'Look' })
        .sort({ fechaDia: 1, created_at: 1 });

      res.json(registros);
    } catch (error) {
      console.error('Error obteniendo calendario:', error);
      res.status(500).json({ error: 'Error al obtener registros del calendario.' });
    }
  });

  router.post('/calendario', authMiddleware, async (req, res) => {
    try {
      const { prendasIds, lookId, fechaDia, fecha, ocasion, clima, notas, estado } = req.body;
      if (!Array.isArray(prendasIds) || prendasIds.length === 0) {
        return res.status(400).json({ error: 'Selecciona al menos una prenda para registrar en el calendario.' });
      }

      const hoyDia = obtenerFechaDiaLocal(new Date());
      const diaFinal = esFechaDiaValida(fechaDia)
        ? fechaDia
        : obtenerFechaDiaLocal(fecha ? new Date(fecha) : new Date());

      const estadoFinal = estado && ['usado', 'planificado'].includes(estado)
        ? estado
        : (diaFinal > hoyDia ? 'planificado' : 'usado');

      const nuevoRegistro = new Uso({
        usuarioId: req.user.id,
        prendas: prendasIds,
        lookId: lookId || null,
        fecha: new Date(`${diaFinal}T12:00:00`),
        fechaDia: diaFinal,
        ocasion: ocasion || 'Casual',
        clima: clima || '',
        notas: notas ? String(notas).slice(0, 280) : '',
        estado: estadoFinal
      });

      await nuevoRegistro.save();
      await recalcularUsosUsuario(req.user.id);

      const poblado = await Uso.findById(nuevoRegistro._id)
        .populate({ path: 'prendas', model: 'Prenda' })
        .populate({ path: 'lookId', model: 'Look' });

      res.status(201).json(poblado);
    } catch (error) {
      console.error('Error guardando en calendario:', error);
      res.status(500).json({ error: 'Error al registrar el outfit en el calendario.' });
    }
  });

  router.patch('/calendario/:id', authMiddleware, async (req, res) => {
    try {
      const { estado, fechaDia, ocasion, clima, notas, prendasIds } = req.body;
      const update = {};

      if (estado && ['usado', 'planificado'].includes(estado)) update.estado = estado;
      if (esFechaDiaValida(fechaDia)) {
        update.fechaDia = fechaDia;
        update.fecha = new Date(`${fechaDia}T12:00:00`);
      }
      if (ocasion !== undefined) update.ocasion = ocasion;
      if (clima !== undefined) update.clima = clima;
      if (notas !== undefined) update.notas = String(notas).slice(0, 280);
      if (Array.isArray(prendasIds) && prendasIds.length > 0) update.prendas = prendasIds;

      const actualizado = await Uso.findOneAndUpdate(
        { _id: req.params.id, usuarioId: req.user.id },
        { $set: update },
        { new: true }
      )
        .populate({ path: 'prendas', model: 'Prenda' })
        .populate({ path: 'lookId', model: 'Look' });

      if (!actualizado) {
        return res.status(404).json({ error: 'Registro de calendario no encontrado.' });
      }

      await recalcularUsosUsuario(req.user.id);
      res.json(actualizado);
    } catch (error) {
      console.error('Error actualizando calendario:', error);
      res.status(500).json({ error: 'Error al actualizar el registro del calendario.' });
    }
  });

  router.delete('/calendario/:id', authMiddleware, async (req, res) => {
    try {
      const eliminado = await Uso.findOneAndDelete({ _id: req.params.id, usuarioId: req.user.id });
      if (!eliminado) {
        return res.status(404).json({ error: 'Registro no encontrado.' });
      }
      await recalcularUsosUsuario(req.user.id);
      res.json({ message: 'Registro eliminado del calendario.' });
    } catch (error) {
      console.error('Error eliminando registro de calendario:', error);
      res.status(500).json({ error: 'Error al eliminar el registro.' });
    }
  });

  // =========================================================================
  // MÓDULO A: ANALÍTICA PROFUNDA DE ESTILO Y CLÓSET
  // =========================================================================
  router.get('/analitica/closet', authMiddleware, async (req, res) => {
    try {
      const analitica = await calcularAnaliticaCloset(req.user.id);
      res.json(analitica);
    } catch (error) {
      console.error('Error calculando analítica de clóset:', error);
      res.status(500).json({ error: 'Error al calcular las métricas de estilo.' });
    }
  });

  return router;
}

module.exports = {
  createArmarioRouter,
  createAclosetRouter: createArmarioRouter,
  parsearOcasiones
};
