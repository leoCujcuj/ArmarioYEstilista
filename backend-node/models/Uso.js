const mongoose = require('mongoose');

function generarOutfitSignature(ids = []) {
  if (!Array.isArray(ids) || ids.length === 0) return '';
  // Ordenar alfabéticamente los ObjectIDs como string único y unirlos por guion bajo
  return Array.from(new Set(ids.map((item) => String(item?._id || item)).filter(Boolean)))
    .sort()
    .join('_');
}

const UsoSchema = new mongoose.Schema({
  usuarioId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true,
    index: true
  },
  prendas: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Prenda'
  }],
  // Firma indexada de combinación para agregación inmediata en analítica
  outfitSignature: {
    type: String,
    default: '',
    index: true
  },
  fecha: {
    type: Date,
    default: Date.now
  },
  // --- Integración Calendario OOTD y Analítica ---
  fechaDia: {
    type: String,
    index: true
  },
  lookId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Look'
  },
  ocasion: {
    type: String,
    trim: true,
    default: 'Casual'
  },
  clima: {
    type: String,
    trim: true,
    default: ''
  },
  notas: {
    type: String,
    trim: true,
    maxlength: 280,
    default: ''
  },
  estado: {
    type: String,
    enum: ['usado', 'planificado'],
    default: 'usado',
    index: true
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

// Alias virtual prendasIds <-> prendas
UsoSchema.virtual('prendasIds')
  .get(function () {
    return this.prendas;
  })
  .set(function (val) {
    this.prendas = val;
  });

UsoSchema.pre('save', function (next) {
  this.outfitSignature = generarOutfitSignature(this.prendas);
  next();
});

UsoSchema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate() || {};
  const target = update.$set ? update.$set : update;
  if (Array.isArray(target.prendas)) {
    target.outfitSignature = generarOutfitSignature(target.prendas);
  }
  next();
});

UsoSchema.index({ usuarioId: 1, fechaDia: -1 });
UsoSchema.index({ usuarioId: 1, estado: 1, outfitSignature: 1 });

const UsoModel = mongoose.model('Uso', UsoSchema);
UsoModel.generarOutfitSignature = generarOutfitSignature;

module.exports = UsoModel;
