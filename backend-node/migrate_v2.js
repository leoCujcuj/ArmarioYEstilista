/**
 * Migración no destructiva v2 (Armario Digital y Calendario):
 * Normaliza prendas existentes (marca, paleta secundaria, tono estacional, ocasiones, origen_carga)
 * y registros de Uso del calendario (fechaDia YYYY-MM-DD, estado, sincronización de contadorUsos).
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Prenda = require('./models/Prenda');
const Uso = require('./models/Uso');
const Look = require('./models/Look');

function toFechaDia(dateInput) {
  const d = dateInput ? new Date(dateInput) : new Date();
  if (Number.isNaN(d.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function inferirOcasiones(prenda) {
  const base = new Set();
  const estilo = (prenda.estilo || '').toLowerCase();
  const formalidad = Number(prenda.formalidad) || 3;

  if (estilo.includes('sport') || estilo.includes('deport') || formalidad === 1) {
    base.add('Deportivo');
    base.add('Casual');
  } else if (estilo.includes('formal') || estilo.includes('etiqueta') || formalidad >= 4) {
    base.add('Oficina');
    base.add('Evento');
  } else if (estilo.includes('smart') || estilo.includes('old money')) {
    base.add('Oficina');
    base.add('Casual');
  } else {
    base.add('Casual');
  }

  return Array.from(base);
}

async function runMigration() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/armario_ia';
  console.log('Conectando a MongoDB para migración v2...');
  await mongoose.connect(mongoUri);

  // 1. Backfill directo en MongoDB (incluyendo campos ausentes a nivel documento crudo para agregaciones)
  await Prenda.collection.updateMany(
    { $or: [{ marca: { $exists: false } }, { marca: null }, { marca: '' }] },
    { $set: { marca: 'Sin marca' } }
  );
  await Prenda.collection.updateMany(
    { color_secundario: { $exists: false } },
    { $set: { color_secundario: '', color_secundario_hex: '' } }
  );
  await Prenda.collection.updateMany(
    { origen_carga: { $exists: false } },
    { $set: { origen_carga: 'galeria' } }
  );

  const prendas = await Prenda.find({});
  let prendasActualizadas = 0;

  for (const p of prendas) {
    let changed = false;
    const raw = p.toObject({ defaults: false });

    const marcaFormateada = Prenda.formatearTitleCase(p.marca, 'Sin Marca');
    if (p.marca !== marcaFormateada || raw.marca_normalizada !== marcaFormateada.toLowerCase()) {
      p.marca = marcaFormateada;
      p.marca_normalizada = marcaFormateada.toLowerCase();
      p.markModified('marca');
      p.markModified('marca_normalizada');
      changed = true;
    }

    if (!raw.tono_estacional) {
      p.tono_estacional = p.subtono || 'Neutro';
      p.markModified('tono_estacional');
      changed = true;
    }
    if (!Array.isArray(raw.ocasiones) || raw.ocasiones.length === 0) {
      p.ocasiones = inferirOcasiones(p);
      p.markModified('ocasiones');
      changed = true;
    }

    if (changed) {
      await p.save();
      prendasActualizadas++;
    }
  }

  // 2. Backfill de Usos (Calendario OOTD + outfitSignature indexado)
  const hoyDia = toFechaDia(new Date());
  const usos = await Uso.find({});
  let usosActualizados = 0;

  for (const u of usos) {
    let changed = false;
    const firmaEsperada = Uso.generarOutfitSignature(u.prendas);
    if (u.outfitSignature !== firmaEsperada) {
      u.outfitSignature = firmaEsperada;
      changed = true;
    }
    if (!u.fechaDia) {
      u.fechaDia = toFechaDia(u.fecha);
      changed = true;
    }
    if (!u.estado) {
      u.estado = u.fechaDia > hoyDia ? 'planificado' : 'usado';
      changed = true;
    }
    if (!u.ocasion) {
      u.ocasion = 'Casual';
      changed = true;
    }
    if (u.clima === undefined) {
      u.clima = '';
      changed = true;
    }
    if (u.notas === undefined) {
      u.notas = '';
      changed = true;
    }
    if (changed) {
      await u.save();
      usosActualizados++;
    }
  }

  // 3. Sincronización de índices
  await Prenda.syncIndexes();
  await Uso.syncIndexes();
  await Look.syncIndexes();

  console.log(`Migración v2 completada. Prendas actualizadas: ${prendasActualizadas}/${prendas.length}. Registros de calendario normalizados: ${usosActualizados}/${usos.length}.`);
  await mongoose.disconnect();
}

runMigration().catch((err) => {
  console.error('Error en migración v2:', err);
  process.exit(1);
});
