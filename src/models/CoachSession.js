const mongoose = require('mongoose');

const coachMessageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'coach'],
    required: true,
  },
  content: {
    type: String,
    required: true,
    trim: true,
  },
}, { timestamps: true });

const coachSessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },
  title: {
    type: String,
    default: 'New Session',
    trim: true,
  },
  messages: [coachMessageSchema],
  aiProvider: {
    type: String,
    enum: ['deepseek', 'openai'],
  },
}, { timestamps: true });

module.exports = mongoose.model('CoachSession', coachSessionSchema);
