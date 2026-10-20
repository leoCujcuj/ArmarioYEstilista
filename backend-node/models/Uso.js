const mongoose = require('mongoose');

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
  fecha: {
    type: Date,
    default: Date.now
  },
  lookId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Look'
  }
});

module.exports = mongoose.model('Uso', UsoSchema);
