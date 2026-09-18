const mongoose = require('mongoose');

const contentSectionSchema = new mongoose.Schema({
  heading: {
    type: String,
    trim: true,
    default: ''
  },
  body: {
    type: String,
    trim: true,
    default: ''
  }
}, { _id: false });

const contentPageSchema = new mongoose.Schema({
  slug: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  sections: {
    type: [contentSectionSchema],
    default: []
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  isPublished: {
    type: Boolean,
    default: true,
    index: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ContentPage', contentPageSchema);
