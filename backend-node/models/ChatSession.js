const mongoose = require('mongoose');

const ChatSessionSchema = new mongoose.Schema({
  usuarioId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Usuario', 
    required: true,
    index: true 
  },
  titulo: { 
    type: String, 
    default: 'Nueva Conversación' 
  },
  mensajes: [{
    role: { type: String, enum: ['user', 'assistant'] },
    content: String,
    timestamp: { type: Date, default: Date.now }
  }],
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

module.exports = mongoose.model('ChatSession', ChatSessionSchema);
