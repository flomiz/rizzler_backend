const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  mobile: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    match: /^\+91\d{10}$/,
  },
  name: {
    type: String,
    trim: true,
    default: '',
  },
  lastLoginAt: {
    type: Date,
  },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
