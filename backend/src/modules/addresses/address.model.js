const mongoose = require('mongoose');

const {
  ADDRESS_OWNER_TYPES,
  ADDRESS_PURPOSES,
  ADDRESS_TYPES
} = require('./address.validation');

const shiprocketSchema = new mongoose.Schema({
  pickupLocationNickname: {
    type: String,
    trim: true,
    default: ''
  },
  shiprocketPickupLocationId: {
    type: String,
    trim: true,
    default: ''
  },
  isSyncedToShiprocket: {
    type: Boolean,
    default: false
  },
  syncedAt: {
    type: Date,
    default: null
  },
  syncStatus: {
    type: String,
    enum: ['not_synced', 'synced', 'failed'],
    default: 'not_synced',
    index: true
  },
  syncError: {
    type: String,
    trim: true,
    default: ''
  }
}, { _id: false });

const addressSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
    default: null
  },
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
    default: null
  },
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    index: true,
    default: null
  },
  addressOwnerType: {
    type: String,
    enum: ADDRESS_OWNER_TYPES,
    required: true,
    index: true
  },
  addressPurpose: {
    type: String,
    enum: ADDRESS_PURPOSES,
    required: true,
    index: true
  },
  label: {
    type: String,
    trim: true,
    default: ''
  },
  contactName: {
    type: String,
    required: true,
    trim: true
  },
  contactPhone: {
    type: String,
    required: true,
    trim: true
  },
  alternatePhone: {
    type: String,
    trim: true,
    default: ''
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    default: ''
  },
  addressLine1: {
    type: String,
    required: true,
    trim: true,
    maxlength: 190
  },
  addressLine2: {
    type: String,
    trim: true,
    maxlength: 190,
    default: ''
  },
  landmark: {
    type: String,
    trim: true,
    default: ''
  },
  locality: {
    type: String,
    trim: true,
    default: ''
  },
  city: {
    type: String,
    required: true,
    trim: true
  },
  state: {
    type: String,
    required: true,
    trim: true
  },
  country: {
    type: String,
    trim: true,
    default: 'India'
  },
  postalCode: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  addressType: {
    type: String,
    enum: ADDRESS_TYPES,
    default: 'home'
  },
  deliveryInstructions: {
    type: String,
    trim: true,
    default: ''
  },
  pickupInstructions: {
    type: String,
    trim: true,
    default: ''
  },
  latitude: {
    type: Number,
    default: null
  },
  longitude: {
    type: Number,
    default: null
  },
  isDefault: {
    type: Boolean,
    default: false,
    index: true
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  isVerified: {
    type: Boolean,
    default: false,
    index: true
  },
  shiprocket: {
    type: shiprocketSchema,
    default: () => ({})
  }
}, { timestamps: true });

addressSchema.index({ userId: 1, addressPurpose: 1, isDefault: 1 });
addressSchema.index({ sellerId: 1, storeId: 1, addressPurpose: 1, isDefault: 1 });
addressSchema.index({
  label: 'text',
  contactName: 'text',
  contactPhone: 'text',
  addressLine1: 'text',
  city: 'text',
  state: 'text',
  postalCode: 'text'
});

module.exports = mongoose.model('Address', addressSchema);
