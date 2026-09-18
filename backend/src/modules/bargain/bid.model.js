const mongoose = require('mongoose');

const bidShippingInfoSchema = new mongoose.Schema({
  name: {
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
  phone: {
    type: String,
    trim: true,
    default: ''
  },
  address: {
    type: String,
    trim: true,
    default: ''
  },
  city: {
    type: String,
    trim: true,
    default: ''
  },
  state: {
    type: String,
    trim: true,
    default: ''
  },
  postalCode: {
    type: String,
    trim: true,
    default: ''
  }
}, { _id: false });

const bidSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    index: true
  },
  buyerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    default: null,
    index: true
  },
  shippingInfo: {
    type: bidShippingInfoSchema,
    default: () => ({})
  },
  razorpayPaymentId: {
    type: String,
    default: ''
  },
  razorpayOrderId: {
    type: String,
    default: '',
    index: true
  },
  paymentStatus: {
    type: String,
    enum: [
      'not_required',
      'pending',
      'pending_authorization',
      'authorized',
      'captured',
      'failed',
      'authorization_released',
      'authorization_expired',
      'auto_refund_pending',
      'refunded',
      'capture_failed',
      'cancelled'
    ],
    default: 'authorized',
    index: true
  },
  bidStatus: {
    type: String,
    enum: [
      'draft',
      'active',
      'pending_payment_authorization',
      'pending_seller_decision',
      'accepted',
      'rejected',
      'won',
      'lost',
      'expired',
      'cancelled',
      'withdrawn'
    ],
    default: 'active',
    index: true
  },
  razorpay: {
    orderId: {
      type: String,
      default: ''
    },
    paymentId: {
      type: String,
      default: ''
    },
    signatureVerified: {
      type: Boolean,
      default: false
    },
    authorizedAt: {
      type: Date,
      default: null
    },
    capturedAt: {
      type: Date,
      default: null
    },
    captureAmount: {
      type: Number,
      min: 0,
      default: 0
    },
    authorizationExpiresAt: {
      type: Date,
      default: null,
      index: true
    },
    captureFailureReason: {
      type: String,
      default: ''
    }
  },
  sellerDecision: {
    decidedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    decidedAt: {
      type: Date,
      default: null
    },
    decision: {
      type: String,
      enum: ['accepted', 'rejected', ''],
      default: ''
    },
    messageToBuyer: {
      type: String,
      default: ''
    },
    rejectionReason: {
      type: String,
      default: ''
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

bidSchema.index({ productId: 1, amount: -1, createdAt: 1 });

// Ensure ObjectIds are properly serialized to strings
bidSchema.set('toJSON', {
  transform(doc, ret) {
    ret.id = ret._id.toString();
    ret.productId = ret.productId.toString();
    ret.buyerId = ret.buyerId.toString();
    ret.sellerId = ret.sellerId.toString();
    if (ret.orderId) ret.orderId = ret.orderId.toString();
    if (ret.scheduleId) ret.scheduleId = ret.scheduleId.toString();
    if (ret.sellerDecision?.decidedBy) ret.sellerDecision.decidedBy = ret.sellerDecision.decidedBy.toString();
    return ret;
  }
});

module.exports = mongoose.model('Bid', bidSchema);
