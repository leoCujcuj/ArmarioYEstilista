const mongoose = require('mongoose');

const productoSchema = new mongoose.Schema({
  usuarioId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true,
    index: true
  },
  nombre: { type: String, required: true },
  tipoPrenda: { type: String },
  color: { type: String },
  marca: { type: String }, // Tiendas donde encontrarlo (ej. "H&M, Zara, Massimo Dutti")
  precioBase: { type: Number, required: true },
  categoria: {
    type: String,
    enum: ['Top', 'Bottom', 'Shoes', 'Outerwear', 'Accessories', 'Other'],
    default: 'Other'
  },
  imageUrl: { type: String, required: true },
  porque: { type: String },
  combinaCon: [String], // Prendas del armario del usuario con las que combina
  prioridad: { type: String, default: 'Media' },
  comprado: { type: Boolean, default: false },
  fechaCompra: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Producto', productoSchema);

