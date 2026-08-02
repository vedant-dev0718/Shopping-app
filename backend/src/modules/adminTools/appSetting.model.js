const mongoose = require('mongoose');

const appSettingSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  type: {
    type: String,
    enum: ['number', 'boolean', 'string', 'array', 'object'],
    required: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('AppSetting', appSettingSchema);
