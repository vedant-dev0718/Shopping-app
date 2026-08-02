const mongoose = require('mongoose');

const authProviderSchema = new mongoose.Schema({
  provider: {
    type: String,
    enum: ['google', 'apple', 'password'],
    required: true
  },
  providerUserId: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  linkedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  passwordHash: {
    type: String,
    select: false
  },
  authProviders: {
    type: [authProviderSchema],
    default: []
  },
  googleId: {
    type: String,
    trim: true,
    index: {
      unique: true,
      sparse: true
    }
  },
  appleId: {
    type: String,
    trim: true,
    index: {
      unique: true,
      sparse: true
    }
  },
  avatarUrl: {
    type: String,
    trim: true
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerifiedAt: {
    type: Date,
    default: null
  },
  signupProvider: {
    type: String,
    enum: ['google', 'apple', 'password'],
    default: 'password'
  },
  phone: {
    type: String,
    trim: true
  },
  role: {
    type: String,
    enum: ['buyer', 'seller', 'admin'],
    required: true
  },
  isAdmin: {
    type: Boolean,
    default: function isAdminDefault() {
      return this.role === 'admin';
    },
    index: true
  },
  adminPermissions: [{
    type: String,
    trim: true
  }],
  adminTotpEnabled: {
    type: Boolean,
    default: false,
    index: true
  },
  adminTotpSecret: {
    type: String,
    trim: true,
    select: false
  },
  adminTotpConfiguredAt: {
    type: Date,
    default: null
  },
  accountStatus: {
    type: String,
    enum: ['active', 'pending_profile', 'suspended', 'banned', 'deleted'],
    default: 'active',
    index: true
  },
  address: {
    type: String,
    trim: true
  },
  authInvalidatedAt: {
    type: Date,
    default: null
  },
  lastLoginAt: {
    type: Date,
    default: null
  },
  failedLoginAttempts: {
    type: Number,
    min: 0,
    default: 0,
    select: false
  },
  loginLockedUntil: {
    type: Date,
    default: null,
    select: false
  },
  deletedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

userSchema.pre('save', function syncAdminFlag(next) {
  if (this.role === 'admin') {
    this.isAdmin = true;
  }

  next();
});

module.exports = mongoose.model('User', userSchema);
