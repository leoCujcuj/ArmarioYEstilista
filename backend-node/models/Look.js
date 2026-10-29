const mongoose = require('mongoose');

const lookSchema = new mongoose.Schema({
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
  // --- Integración Nombre y Temporada para asignación al Calendario ---
  nombre: {
    type: String,
    default: ''
  },
  temporada: {
    type: String,
    default: 'Todo el año'
  },
  ocasion: String,
  explicacion: String,
  consejo_color: String,
  score: {
    color: { type: Number, default: 85 },
    balance: { type: Number, default: 85 }
  },
  liked: {
    type: Boolean,
    default: true
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Look', lookSchema);
