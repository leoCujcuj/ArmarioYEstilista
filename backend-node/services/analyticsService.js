/**
 * Motor Analítico de Clóset y Sincronización de Calendario OOTD.
 * Calcula métricas reales a partir del historial de Uso (prenda más usada, combinaciones
 * recurrentes por pares/conjuntos, categoría preferida, análisis cromático/telas y marca favorita).
 */

const mongoose = require('mongoose');
const Prenda = require('../models/Prenda');
const Uso = require('../models/Uso');

function obtenerFechaDiaLocal(dateInput = new Date()) {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(d.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }
  try {
    const tz = process.env.APP_TIMEZONE || 'America/Guatemala';
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(d);
  } catch (e) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

/**
 * Recalcula contadorUsos y ultimoUso de todas las prendas del usuario
 * tomando como fuente de verdad los registros efectivos del calendario (usados o con fecha <= hoy).
 */
async function recalcularUsosUsuario(usuarioId) {
  const hoyDia = obtenerFechaDiaLocal(new Date());
  const userObjId = new mongoose.Types.ObjectId(usuarioId);

  // Promover automáticamente looks planificados cuya fecha ya llegó
  await Uso.updateMany(
    { usuarioId: userObjId, estado: 'planificado', fechaDia: { $lte: hoyDia } },
    { $set: { estado: 'usado' } }
  );

  const usosEfectivos = await Uso.find({
    usuarioId: userObjId,
    $or: [
      { estado: 'usado' },
      { estado: { $exists: false } },
      { fechaDia: { $lte: hoyDia } }
    ]
  }).lean();

  const conteoPorPrenda = new Map();
  const ultimaFechaPorPrenda = new Map();

  for (const registro of usosEfectivos) {
    const fechaReg = registro.fechaDia
      ? new Date(`${registro.fechaDia}T12:00:00`)
      : new Date(registro.fecha || Date.now());

    for (const rawId of registro.prendas || []) {
      const idStr = String(rawId);
      conteoPorPrenda.set(idStr, (conteoPorPrenda.get(idStr) || 0) + 1);
      const prevDate = ultimaFechaPorPrenda.get(idStr);
      if (!prevDate || fechaReg > prevDate) {
        ultimaFechaPorPrenda.set(idStr, fechaReg);
      }
    }
  }

  const prendasUsuario = await Prenda.find({ usuarioId }).select('_id').lean();
  const bulkOps = prendasUsuario.map((p) => {
    const idStr = String(p._id);
    return {
      updateOne: {
        filter: { _id: p._id, usuarioId },
        update: {
          $set: {
            contadorUsos: conteoPorPrenda.get(idStr) || 0,
            ultimoUso: ultimaFechaPorPrenda.get(idStr) || null
          }
        }
      }
    };
  });

  if (bulkOps.length > 0) {
    await Prenda.bulkWrite(bulkOps);
  }
}

/**
 * Calcula el panel analítico integral del clóset basado en el historial del calendario.
 */
async function calcularAnaliticaCloset(usuarioId) {
  const hoyDia = obtenerFechaDiaLocal(new Date());
  const userObjId = new mongoose.Types.ObjectId(usuarioId);

  // Garantizar que registros planificados vencidos pasen a estado 'usado' antes de agregar
  await Uso.updateMany(
    { usuarioId: userObjId, estado: 'planificado', fechaDia: { $lte: hoyDia } },
    { $set: { estado: 'usado' } }
  );

  const [prendas, registrosCalendario, topSignaturesAgg] = await Promise.all([
    Prenda.find({ usuarioId: userObjId }).lean(),
    Uso.find({ usuarioId: userObjId })
      .populate({ path: 'prendas', model: 'Prenda' })
      .sort({ fechaDia: -1, fecha: -1 })
      .lean(),
    // Consulta inmediata por índice sobre outfitSignature para combinaciones más usadas
    Uso.aggregate([
      {
        $match: {
          usuarioId: userObjId,
          estado: 'usado',
          outfitSignature: { $exists: true, $nin: ['', null] },
          'prendas.1': { $exists: true }
        }
      },
      {
        $group: {
          _id: '$outfitSignature',
          count: { $sum: 1 },
          prendas: { $first: '$prendas' },
          ultimaFecha: { $max: '$fechaDia' },
          ocasion: { $first: '$ocasion' }
        }
      },
      { $sort: { count: -1, ultimaFecha: -1 } },
      { $limit: 3 }
    ])
  ]);

  const mapaPrendas = new Map(prendas.map((p) => [String(p._id), p]));

  // Separar registros efectivos (vestidos) vs futuros planificados
  const registrosUsados = registrosCalendario.filter((r) => {
    const dia = r.fechaDia || obtenerFechaDiaLocal(r.fecha);
    return r.estado === 'usado' || (!r.estado && dia <= hoyDia) || (r.estado === 'planificado' && dia <= hoyDia);
  });

  const registrosPlanificados = registrosCalendario.filter((r) => {
    const dia = r.fechaDia || obtenerFechaDiaLocal(r.fecha);
    return r.estado === 'planificado' && dia > hoyDia;
  });

  // 1. CONTADORES POR ID DE PRENDA SEGÚN CALENDARIO
  const usoPorPrendaId = new Map();
  const usoPorCategoria = new Map();
  const usoPorColor = new Map();
  const usoPorTela = new Map();
  const usoPorSubtono = new Map();
  const usoPorMarca = new Map();
  const conteoPares = new Map();

  let totalPuestasPrendas = 0;

  for (const reg of registrosUsados) {
    const itemsValidos = (reg.prendas || [])
      .map((item) => (item && item._id ? item : mapaPrendas.get(String(item))))
      .filter(Boolean);

    // Evitar duplicados accidentales en el mismo registro
    const idsUnicos = Array.from(new Set(itemsValidos.map((p) => String(p._id)))).sort();
    const objetosUnicos = idsUnicos.map((id) => mapaPrendas.get(id)).filter(Boolean);

    for (const prenda of objetosUnicos) {
      const idStr = String(prenda._id);
      usoPorPrendaId.set(idStr, (usoPorPrendaId.get(idStr) || 0) + 1);
      totalPuestasPrendas++;

      // Categoría
      const cat = prenda.categoria || 'Other';
      usoPorCategoria.set(cat, (usoPorCategoria.get(cat) || 0) + 1);

      // Color primario (y secundario con peso complementario)
      const colorNombre = (prenda.color_principal || 'Neutro').trim();
      const colorKey = colorNombre.toLowerCase();
      const actualColor = usoPorColor.get(colorKey) || {
        color: colorNombre,
        hex: prenda.color_hex || '#555555',
        usos: 0
      };
      actualColor.usos += 1;
      usoPorColor.set(colorKey, actualColor);

      if (prenda.color_secundario && prenda.color_secundario.trim()) {
        const secNombre = prenda.color_secundario.trim();
        const secKey = secNombre.toLowerCase();
        const actualSec = usoPorColor.get(secKey) || {
          color: secNombre,
          hex: prenda.color_secundario_hex || '#888888',
          usos: 0
        };
        actualSec.usos += 0.5;
        usoPorColor.set(secKey, actualSec);
      }

      // Subtono / Armonía térmica
      const sub = prenda.subtono || 'Neutro';
      usoPorSubtono.set(sub, (usoPorSubtono.get(sub) || 0) + 1);

      // Tipo de tela / Material
      const telaRaw = (prenda.material || 'Algodón').split('/')[0].trim();
      usoPorTela.set(telaRaw, (usoPorTela.get(telaRaw) || 0) + 1);

      // Marca normalizada en uso real
      const marcaDisplay = Prenda.formatearTitleCase(prenda.marca, 'Sin Marca');
      const marcaKey = (prenda.marca_normalizada || marcaDisplay.toLowerCase()).trim();
      const prevMarcaUso = usoPorMarca.get(marcaKey) || { marca: marcaDisplay, usos: 0 };
      prevMarcaUso.usos += 1;
      usoPorMarca.set(marcaKey, prevMarcaUso);
    }

    // Minería de Pares Recurrentes (combinaciones de 2 prendas que se repiten incluso en distintos looks)
    for (let i = 0; i < idsUnicos.length; i++) {
      for (let j = i + 1; j < idsUnicos.length; j++) {
        const parKey = `${idsUnicos[i]}::${idsUnicos[j]}`;
        const prevPar = conteoPares.get(parKey) || {
          ids: [idsUnicos[i], idsUnicos[j]],
          veces: 0,
          ultimaFecha: reg.fechaDia || obtenerFechaDiaLocal(reg.fecha)
        };
        prevPar.veces += 1;
        conteoPares.set(parKey, prevPar);
      }
    }
  }

  // Fallback suave sobre inventario si el usuario aún no tiene puestas en calendario para gráficas cromáticas/categorías
  const fuenteInventario = totalPuestasPrendas === 0 && prendas.length > 0;
  if (fuenteInventario) {
    for (const prenda of prendas) {
      const cat = prenda.categoria || 'Other';
      usoPorCategoria.set(cat, (usoPorCategoria.get(cat) || 0) + 1);

      const colorNombre = (prenda.color_principal || 'Neutro').trim();
      const colorKey = colorNombre.toLowerCase();
      const actualColor = usoPorColor.get(colorKey) || {
        color: colorNombre,
        hex: prenda.color_hex || '#555555',
        usos: 0
      };
      actualColor.usos += 1;
      usoPorColor.set(colorKey, actualColor);

      const sub = prenda.subtono || 'Neutro';
      usoPorSubtono.set(sub, (usoPorSubtono.get(sub) || 0) + 1);

      const telaRaw = (prenda.material || 'Algodón').split('/')[0].trim();
      usoPorTela.set(telaRaw, (usoPorTela.get(telaRaw) || 0) + 1);
    }
  }

  const baseDivisor = fuenteInventario ? prendas.length : Math.max(1, totalPuestasPrendas);

  // Ranking de prendas por uso en calendario (con desempate por contadorUsos histórico)
  const prendasConMetricas = prendas.map((p) => {
    const usosCal = usoPorPrendaId.get(String(p._id)) ?? (p.contadorUsos || 0);
    return {
      ...p,
      usosCalendario: usosCal
    };
  });

  const ordenadasPorUso = [...prendasConMetricas].sort((a, b) => b.usosCalendario - a.usosCalendario);
  const prendaMasUtilizada = ordenadasPorUso.length > 0 && ordenadasPorUso[0].usosCalendario > 0
    ? ordenadasPorUso[0]
    : null;

  const masUsadas = ordenadasPorUso.filter((p) => p.usosCalendario > 0).slice(0, 6);
  const nuncaUsadas = prendasConMetricas.filter((p) => p.usosCalendario === 0).slice(0, 8);

  // Combinaciones recurrentes calculadas vía Uso.aggregate sobre outfitSignature indexado
  const conjuntosOrdenados = (topSignaturesAgg || [])
    .map((agg) => {
      const prendasHidratadas = (agg.prendas || [])
        .map((id) => mapaPrendas.get(String(id)))
        .filter(Boolean);
      return {
        signature: agg._id,
        tipo: 'conjunto',
        veces: agg.count,
        esRecurrente: agg.count >= 2,
        ultimaFecha: agg.ultimaFecha || hoyDia,
        ocasion: agg.ocasion || 'Casual',
        prendas: prendasHidratadas
      };
    })
    .filter((c) => c.prendas.length >= 2);

  const paresOrdenados = Array.from(conteoPares.values())
    .sort((a, b) => b.veces - a.veces)
    .slice(0, 5)
    .map((par) => ({
      tipo: 'par',
      veces: par.veces,
      esRecurrente: par.veces >= 2,
      ultimaFecha: par.ultimaFecha,
      prendas: par.ids.map((id) => mapaPrendas.get(id)).filter(Boolean)
    }));

  // Categorías preferidas
  const inventarioPorCat = new Map();
  for (const p of prendas) {
    const c = p.categoria || 'Other';
    inventarioPorCat.set(c, (inventarioPorCat.get(c) || 0) + 1);
  }

  const categoriasDistribucion = Array.from(usoPorCategoria.entries())
    .map(([categoria, conteo]) => ({
      categoria,
      usos: conteo,
      cantidadInventario: inventarioPorCat.get(categoria) || 0,
      porcentaje: Math.round((conteo / baseDivisor) * 100)
    }))
    .sort((a, b) => b.usos - a.usos);

  // Análisis cromático y de telas
  const totalPesoColores = Math.max(
    1,
    Array.from(usoPorColor.values()).reduce((acc, item) => acc + item.usos, 0)
  );
  const coloresFrecuentes = Array.from(usoPorColor.values())
    .sort((a, b) => b.usos - a.usos)
    .slice(0, 6)
    .map((c) => ({
      color: c.color,
      hex: c.hex,
      usos: Math.round(c.usos * 10) / 10,
      porcentaje: Math.round((c.usos / totalPesoColores) * 100)
    }));

  const telasFrecuentes = Array.from(usoPorTela.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([material, usos]) => ({
      material,
      usos,
      porcentaje: Math.round((usos / baseDivisor) * 100)
    }));

  const subtonosDistribucion = Array.from(usoPorSubtono.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([subtono, usos]) => ({
      subtono,
      usos,
      porcentaje: Math.round((usos / baseDivisor) * 100)
    }));

  // Ranking de Marcas normalizado (unificando mayúsculas/espacios vía marca_normalizada)
  const marcasMap = new Map();
  for (const p of prendas) {
    const display = Prenda.formatearTitleCase(p.marca, 'Sin Marca');
    const key = (p.marca_normalizada || display.toLowerCase()).trim();
    const entry = marcasMap.get(key) || { marca: display, cantidadPrendas: 0, usos: 0 };
    entry.cantidadPrendas += 1;
    marcasMap.set(key, entry);
  }
  for (const [key, infoUso] of usoPorMarca.entries()) {
    const entry = marcasMap.get(key) || { marca: infoUso.marca, cantidadPrendas: 0, usos: 0 };
    entry.usos = infoUso.usos;
    marcasMap.set(key, entry);
  }

  const todasMarcas = Array.from(marcasMap.values()).sort((a, b) => {
    if (b.usos !== a.usos) return b.usos - a.usos;
    return b.cantidadPrendas - a.cantidadPrendas;
  });

  const marcasConNombre = todasMarcas.filter((m) => m.marca.toLowerCase() !== 'sin marca');
  const marcaFavorita = marcasConNombre.length > 0 ? marcasConNombre[0] : (todasMarcas[0] || null);

  const prendasEstrenadas = prendasConMetricas.filter((p) => p.usosCalendario > 0).length;
  const tasaRotacion = prendas.length > 0 ? Math.round((prendasEstrenadas / prendas.length) * 100) : 0;

  return {
    resumen: {
      totalPrendas: prendas.length,
      prendasEstrenadas,
      tasaRotacion,
      totalRegistrosUsados: registrosUsados.length,
      totalPlanificados: registrosPlanificados.length,
      basadoEnInventarioPorFaltaDeUsos: fuenteInventario
    },
    prendaMasUtilizada,
    masUsadas,
    nuncaUsadas,
    combinaciones: {
      conjuntos: conjuntosOrdenados,
      pares: paresOrdenados,
      destacada: conjuntosOrdenados.find((c) => c.veces >= 2)
        || paresOrdenados.find((p) => p.veces >= 2)
        || conjuntosOrdenados[0]
        || paresOrdenados[0]
        || null
    },
    categoriaPreferida: categoriasDistribucion[0] || null,
    categoriasDistribucion,
    analisisCromatico: {
      colores: coloresFrecuentes,
      subtonos: subtonosDistribucion,
      telas: telasFrecuentes
    },
    marcaFavorita,
    marcasRanking: (marcasConNombre.length > 0 ? marcasConNombre : todasMarcas).slice(0, 6)
  };
}

module.exports = {
  obtenerFechaDiaLocal,
  recalcularUsosUsuario,
  calcularAnaliticaCloset
};
