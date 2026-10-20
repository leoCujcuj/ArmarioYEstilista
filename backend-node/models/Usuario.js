const mongoose = require('mongoose');

const usuarioSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  nombre: { type: String },
  edad: { type: Number },
  fotoUrl: { type: String },
  fotoCaraUrl: { type: String },
  fotoCuerpoUrl: { type: String },
  direccion: { type: String },
  galeriaInspiracion: [String],
  presupuesto: { type: Number, default: 1000 },
  gastado: { type: Number, default: 0 },
  settings: {
    idioma: { type: String, default: 'es' },
    atrevimiento: { type: Number, default: 50 } // 0 a 100
  },
  biometria: {
    genero: String,
    objetivo: String,
    estilos: [String],
    morfologia: String,
    proporcionVertical: String,
    recomendacionCorte: String,
    colorimetria: String,
    subtono: String,
    paletaRecomendada: [String],
    formaCara: String,
    tipoPelo: String,
    medidas: Object,
    likes: [String],
    dislikes: [{
      prendasIds: [String],
      motivo: String, // 'corte', 'color', 'estilo'
      detalle: String,
      fecha: { type: Date, default: Date.now }
    }],
    preferenciasFeedback: [String]
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Usuario', usuarioSchema);

