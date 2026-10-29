const mongoose = require('mongoose');

const ACRONIMOS_MODA = new Set(['h&m', 'cos', 'ia', 'uv', 'xl', 'xs', 'xxl']);

function formatearTitleCase(valor, fallback = '') {
  if (typeof valor !== 'string') return fallback;
  const limpio = valor.trim().replace(/\s+/g, ' ');
  if (!limpio) return fallback;

  return limpio
    .split(' ')
    .map((palabra) => {
      const lower = palabra.toLowerCase();
      if (ACRONIMOS_MODA.has(lower)) return lower.toUpperCase();
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ');
}

const PrendaSchema = new mongoose.Schema({
  usuarioId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true,
    index: true
  },
  nombre: {
    type: String,
    trim: true
  },
  // --- Integración Metadata: Marca normalizada, Paleta Dual y Ocasiones ---
  marca: {
    type: String,
    trim: true,
    default: 'Sin Marca',
    index: true
  },
  marca_normalizada: {
    type: String,
    trim: true,
    lowercase: true,
    default: 'sin marca',
    index: true
  },
  url_imagen_original: {
    type: String,
    trim: true
  },
  url_imagen_limpia: {
    type: String,
    required: true,
    trim: true
  },
  categoria: {
    type: String,
    trim: true,
    default: 'Other'
  },
  color_principal: {
    type: String,
    trim: true
  },
  color_hex: {
    type: String,
    trim: true,
    default: '#222222'
  },
  color_secundario: {
    type: String,
    trim: true,
    default: ''
  },
  color_secundario_hex: {
    type: String,
    trim: true,
    default: ''
  },
  subtono: {
    type: String,
    trim: true,
    default: 'Neutro'
  },
  tono_estacional: {
    type: String,
    trim: true,
    default: 'Neutro'
  },
  material: {
    type: String,
    trim: true
  },
  corte_silueta: {
    type: String,
    trim: true,
    default: 'Regular'
  },
  estilo: {
    type: String,
    trim: true
  },
  temporada: {
    type: String,
    trim: true,
    default: 'Todo el año'
  },
  ocasiones: {
    type: [String],
    default: ['Casual']
  },
  origen_carga: {
    type: String,
    enum: ['camara', 'galeria', 'web', 'basicos'],
    default: 'galeria'
  },
  formalidad: {
    type: Number,
    default: 3
  },
  tags_ia: [String],
  descripcion: {
    type: String,
    trim: true
  },
  favorito: {
    type: Boolean,
    default: false
  },
  contadorUsos: {
    type: Number,
    default: 0
  },
  ultimoUso: {
    type: Date
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

// Hook pre('save') para limpieza (.trim()) y capitalización estándar (Title Case)
PrendaSchema.pre('save', function (next) {
  if (typeof this.nombre === 'string') {
    this.nombre = this.nombre.trim().replace(/\s+/g, ' ');
  }

  this.marca = formatearTitleCase(this.marca, 'Sin Marca');
  this.marca_normalizada = this.marca.toLowerCase();

  if (typeof this.color_principal === 'string' && this.color_principal.trim()) {
    this.color_principal = formatearTitleCase(this.color_principal);
  }
  if (typeof this.color_secundario === 'string') {
    this.color_secundario = this.color_secundario.trim()
      ? formatearTitleCase(this.color_secundario)
      : '';
  }
  if (typeof this.material === 'string' && this.material.trim()) {
    this.material = formatearTitleCase(this.material);
  }
  if (typeof this.corte_silueta === 'string' && this.corte_silueta.trim()) {
    this.corte_silueta = formatearTitleCase(this.corte_silueta, 'Regular');
  }
  if (typeof this.estilo === 'string' && this.estilo.trim()) {
    this.estilo = formatearTitleCase(this.estilo);
  }
  if (typeof this.color_hex === 'string' && this.color_hex.trim()) {
    this.color_hex = this.color_hex.trim().toUpperCase();
  }
  if (typeof this.color_secundario_hex === 'string') {
    this.color_secundario_hex = this.color_secundario_hex.trim().toUpperCase();
  }
  if (Array.isArray(this.ocasiones)) {
    const limpias = Array.from(
      new Set(
        this.ocasiones
          .map((o) => formatearTitleCase(String(o)))
          .filter(Boolean)
      )
    );
    this.ocasiones = limpias.length > 0 ? limpias : ['Casual'];
  }

  next();
});

// Sincronizar la misma normalización en actualizaciones PUT / findOneAndUpdate
PrendaSchema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate() || {};
  const target = update.$set ? update.$set : update;

  if (typeof target.nombre === 'string') {
    target.nombre = target.nombre.trim().replace(/\s+/g, ' ');
  }
  if (target.marca !== undefined) {
    target.marca = formatearTitleCase(target.marca, 'Sin Marca');
    target.marca_normalizada = target.marca.toLowerCase();
  }
  if (typeof target.color_principal === 'string' && target.color_principal.trim()) {
    target.color_principal = formatearTitleCase(target.color_principal);
  }
  if (typeof target.color_secundario === 'string') {
    target.color_secundario = target.color_secundario.trim()
      ? formatearTitleCase(target.color_secundario)
      : '';
  }
  if (typeof target.material === 'string' && target.material.trim()) {
    target.material = formatearTitleCase(target.material);
  }
  if (Array.isArray(target.ocasiones)) {
    const limpias = Array.from(
      new Set(
        target.ocasiones
          .map((o) => formatearTitleCase(String(o)))
          .filter(Boolean)
      )
    );
    target.ocasiones = limpias.length > 0 ? limpias : ['Casual'];
  }

  next();
});

PrendaSchema.index({ usuarioId: 1, marca: 1 });
PrendaSchema.index({ usuarioId: 1, marca_normalizada: 1 });

const PrendaModel = mongoose.model('Prenda', PrendaSchema);
PrendaModel.formatearTitleCase = formatearTitleCase;

module.exports = PrendaModel;
