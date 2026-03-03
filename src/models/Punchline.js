const mongoose = require('mongoose');

const punchlineSchema = new mongoose.Schema({
  punchline: {
    type: String,
    required: true,
    trim: true,
  },
  category: {
    type: String,
    trim: true,
  },
  topic: {
    type: String,
    trim: true,
    default: '',
  },
  aiProvider: {
    type: String,
    enum: ['deepseek', 'openai'],
    required: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('Punchline', punchlineSchema);
