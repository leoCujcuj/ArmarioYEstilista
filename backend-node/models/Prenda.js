const mongoose = require('mongoose');

const PrendaSchema = new mongoose.Schema({
  usuarioId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true,
    index: true
  },
  nombre: String,
  url_imagen_original: String,
  url_imagen_limpia: {
    type: String,
    required: true
  },
  categoria: {
    type: String,
    default: 'Other'
  },
  color_principal: String,
  color_hex: {
    type: String,
    default: '#222222'
  },
  subtono: {
    type: String,
    default: 'Neutro'
  },
  material: String,
  corte_silueta: {
    type: String,
    default: 'Regular'
  },
  estilo: String,
  temporada: {
    type: String,
    default: 'Todo el año'
  },
  formalidad: {
    type: Number,
    default: 3
  },
  tags_ia: [String],
  descripcion: String,
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

module.exports = mongoose.model('Prenda', PrendaSchema);

