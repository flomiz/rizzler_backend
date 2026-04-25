const mongoose = require('mongoose');

const EMOTIONS = [
  'romantic', 'funny', 'flirty', 'sarcastic',
  'professional', 'caring', 'friendly', 'witty',
];

const chatSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
    index: true,
  },
  message: {
    type: String,
    required: true,
    trim: true,
  },
  emotion: {
    type: String,
    required: true,
    enum: EMOTIONS,
  },
  responses: {
    type: [String],
    required: true,
    validate: {
      validator: (arr) => arr.length === 3,
      message: 'Exactly 3 responses are required',
    },
  },
  selectedResponse: {
    type: Number,
    min: 0,
    max: 2,
    default: null,
  },
  aiProvider: {
    type: String,
    enum: ['deepseek', 'openai'],
    required: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('Chat', chatSchema);
module.exports.EMOTIONS = EMOTIONS;
