const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true
  },
  titleSnapshot: {
    type: String,
    required: true,
    trim: true
  },
  imageSnapshot: {
    type: String,
    trim: true,
    default: ''
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  priceSnapshot: {
    type: Number,
    required: true,
    min: 0
  },
  itemTotal: {
    type: Number,
    min: 0,
    default: 0
  },
  itemSubtotal: {
    type: Number,
    min: 0,
    default: 0
  },
  commissionPercentage: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  platformCommissionAmount: {
    type: Number,
    min: 0,
    default: 0
  },
  sellerEarningsAmount: {
    type: Number,
    min: 0,
    default: 0
  },
  paymentFeeAmount: {
    type: Number,
    min: 0,
    default: 0
  },
  refundAmount: {
    type: Number,
    min: 0,
    default: 0
  },
  payoutStatus: {
    type: String,
    enum: ['pending', 'eligible', 'paid', 'held', 'cancelled', 'refunded'],
    default: 'pending',
    index: true
  },
  payoutId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SellerPayout',
    default: null
  },
  status: {
    type: String,
    default: 'placed'
  },
  sellerPayoutAmount: {
    type: Number,
    min: 0,
    default: 0
  },
  sellerPayoutStatus: {
    type: String,
    enum: ['pending', 'route_transfer_initiated', 'route_transfer_failed', 'released', 'failed'],
    default: 'pending'
  },
  itemStatus: {
    type: String,
    enum: [
      'placed',
      'awaiting_seller_acceptance',
      'seller_accepted',
      'seller_rejected',
      'confirmed',
      'processing',
      'shipped',
      'delivered',
      'cancelled',
      'return_requested',
      'return_approved',
      'return_rejected',
      'returned',
      'refunded'
    ],
    default: 'placed'
  },
  itemAcceptanceStatus: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending',
    index: true
  },
  unavailableReason: {
    type: String,
    trim: true,
    default: ''
  },
  returnEligible: {
    type: Boolean,
    default: true
  },
  itemCancelledAt: {
    type: Date,
    default: null
  },
  itemCancelReason: {
    type: String,
    default: ''
  },
  itemShippedAt: {
    type: Date,
    default: null
  },
  itemDeliveredAt: {
    type: Date,
    default: null
  },
  itemTrackingNumber: {
    type: String,
    default: ''
  },
  shiprocketOrderId: {
    type: Number,
    default: null
  },
  shiprocketShipmentId: {
    type: Number,
    default: null
  },
  shippingLabelUrl: {
    type: String,
    default: ''
  },
  razorpayTransferId: {
    type: String,
    default: ''
  }
});

const cancelInfoSchema = new mongoose.Schema({
  cancelledBy: {
    type: String,
    enum: ['buyer', 'seller', 'admin', ''],
    default: ''
  },
  cancelReason: {
    type: String,
    trim: true,
    default: ''
  },
  cancelledAt: {
    type: Date,
    default: null
  },
  cancellationStatus: {
    type: String,
    enum: ['none', 'requested', 'approved', 'rejected', 'cancelled'],
    default: 'none',
    index: true
  },
  cancellationRejectionReason: {
    type: String,
    trim: true,
    default: ''
  }
}, { _id: false });

const returnInfoSchema = new mongoose.Schema({
  returnStatus: {
    type: String,
    enum: ['none', 'requested', 'approved', 'rejected', 'in_transit', 'received', 'completed'],
    default: 'none',
    index: true
  },
  requestedBy: {
    type: String,
    enum: ['buyer', 'seller', 'admin', ''],
    default: ''
  },
  returnReason: {
    type: String,
    trim: true,
    default: ''
  },
  returnDescription: {
    type: String,
    trim: true,
    default: ''
  },
  returnImageUrls: [{
    type: String,
    trim: true
  }],
  requestedAt: {
    type: Date,
    default: null
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  reviewedAt: {
    type: Date,
    default: null
  },
  rejectionReason: {
    type: String,
    trim: true,
    default: ''
  },
  returnReceivedAt: {
    type: Date,
    default: null
  },
  returnTrackingNumber: {
    type: String,
    trim: true,
    default: ''
  }
}, { _id: false });

const refundInfoSchema = new mongoose.Schema({
  refundId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Refund',
    default: null
  },
  razorpayRefundId: {
    type: String,
    trim: true,
    default: ''
  },
  refundAmount: {
    type: Number,
    min: 0,
    default: 0
  },
  refundReason: {
    type: String,
    trim: true,
    default: ''
  },
  refundStatus: {
    type: String,
    enum: ['none', 'refund_pending', 'refund_processing', 'refunded', 'refund_failed', 'partially_refunded'],
    default: 'none',
    index: true
  },
  refundFailureReason: {
    type: String,
    trim: true,
    default: ''
  },
  refundedAt: {
    type: Date,
    default: null
  },
  refundMetadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, { _id: false });

const deliveryInfoSchema = new mongoose.Schema({
  deliveredAt: {
    type: Date,
    default: null
  },
  returnWindowEndsAt: {
    type: Date,
    default: null
  },
  deliveryConfirmedBy: {
    type: String,
    enum: ['shiprocket_webhook', 'seller_manual', 'admin_manual', ''],
    default: ''
  },
  deliveryConfirmationStatus: {
    type: String,
    enum: ['pending', 'confirmed', 'review_required'],
    default: 'pending',
    index: true
  },
  deliveryReviewRequired: {
    type: Boolean,
    default: false,
    index: true
  },
  deliveryReviewReason: {
    type: String,
    trim: true,
    default: ''
  },
  deliveryReviewFlaggedAt: {
    type: Date,
    default: null
  },
  lastCourierStatus: {
    type: String,
    trim: true,
    default: ''
  },
  lastCourierStatusAt: {
    type: Date,
    default: null
  }
}, { _id: false });

const sellerAcceptanceSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'expired'],
    default: 'pending',
    index: true
  },
  acceptedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  acceptedAt: {
    type: Date,
    default: null
  },
  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  rejectedAt: {
    type: Date,
    default: null
  },
  rejectionReason: {
    type: String,
    trim: true,
    default: ''
  },
  rejectionMessageToBuyer: {
    type: String,
    trim: true,
    default: ''
  },
  expiresAt: {
    type: Date,
    default: null,
    index: true
  }
}, { _id: false });

const manualPaymentConfirmationSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ['none', 'buyer_submitted', 'seller_confirmed'],
    default: 'none'
  },
  buyerMarkedPaidAt: { type: Date, default: null },
  sellerConfirmedAt: { type: Date, default: null },
  sellerConfirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  storeName: { type: String, trim: true, default: '' },
  upiId: { type: String, trim: true, default: '' },
  qrCode: { type: String, trim: true, default: '' },
  amount: { type: Number, min: 0, default: 0 }
}, { _id: false });

const paymentFlowSchema = new mongoose.Schema({
  captureAfterSellerAcceptance: {
    type: Boolean,
    default: false
  },
  razorpayOrderId: {
    type: String,
    trim: true,
    default: ''
  },
  razorpayPaymentId: {
    type: String,
    trim: true,
    default: ''
  },
  razorpayRefundId: {
    type: String,
    trim: true,
    default: ''
  },
  authorizedAt: {
    type: Date,
    default: null
  },
  capturedAt: {
    type: Date,
    default: null
  },
  signatureVerified: {
    type: Boolean,
    default: false
  },
  captureAmount: {
    type: Number,
    min: 0,
    default: 0
  },
  captureResponseSafeSummary: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  captureFailureReason: {
    type: String,
    trim: true,
    default: ''
  },
  authorizationExpiresAt: {
    type: Date,
    default: null,
    index: true
  },
  razorpayFees: {
    type: Number,
    min: 0,
    default: 0
  },
  razorpayTax: {
    type: Number,
    min: 0,
    default: 0
  },
  refundedAt: {
    type: Date,
    default: null
  }
}, { _id: false });

const razorpayPaymentSchema = new mongoose.Schema({
  orderId: {
    type: String,
    trim: true,
    default: ''
  },
  paymentId: {
    type: String,
    trim: true,
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
  captureResponseSafeSummary: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  captureFailureReason: {
    type: String,
    trim: true,
    default: ''
  },
  authorizationExpiresAt: {
    type: Date,
    default: null,
    index: true
  }
}, { _id: false });

const inventoryReservationSchema = new mongoose.Schema({
  reservationIds: [{
    type: String,
    trim: true
  }],
  expiresAt: {
    type: Date,
    default: null,
    index: true
  },
  status: {
    type: String,
    enum: ['active', 'confirmed', 'released', 'expired', 'consumed'],
    default: 'active',
    index: true
  }
}, { _id: false });

const inventoryConfirmationSchema = new mongoose.Schema({
  confirmedAvailable: {
    type: Boolean,
    default: false
  },
  confirmedAt: {
    type: Date,
    default: null
  },
  unavailableReason: {
    type: String,
    trim: true,
    default: ''
  }
}, { _id: false });

const shippingInfoSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  address: {
    type: String,
    required: true,
    trim: true
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
  postalCode: {
    type: String,
    required: true,
    trim: true
  }
}, { _id: false });

const shippingAddressSnapshotSchema = new mongoose.Schema({
  contactName: { type: String, trim: true, default: '' },
  contactPhone: { type: String, trim: true, default: '' },
  email: { type: String, trim: true, lowercase: true, default: '' },
  addressLine1: { type: String, trim: true, default: '' },
  addressLine2: { type: String, trim: true, default: '' },
  landmark: { type: String, trim: true, default: '' },
  locality: { type: String, trim: true, default: '' },
  city: { type: String, trim: true, default: '' },
  state: { type: String, trim: true, default: '' },
  country: { type: String, trim: true, default: 'India' },
  postalCode: { type: String, trim: true, default: '' },
  deliveryInstructions: { type: String, trim: true, default: '' }
}, { _id: false });

const pickupAddressSnapshotSchema = new mongoose.Schema({
  contactName: { type: String, trim: true, default: '' },
  contactPhone: { type: String, trim: true, default: '' },
  email: { type: String, trim: true, lowercase: true, default: '' },
  addressLine1: { type: String, trim: true, default: '' },
  addressLine2: { type: String, trim: true, default: '' },
  landmark: { type: String, trim: true, default: '' },
  locality: { type: String, trim: true, default: '' },
  city: { type: String, trim: true, default: '' },
  state: { type: String, trim: true, default: '' },
  country: { type: String, trim: true, default: 'India' },
  postalCode: { type: String, trim: true, default: '' },
  pickupInstructions: { type: String, trim: true, default: '' },
  shiprocketPickupLocationNickname: { type: String, trim: true, default: '' }
}, { _id: false });

const orderSchema = new mongoose.Schema({
  buyerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  orderNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  sellerIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  }],
  items: [orderItemSchema],
  shippingInfo: {
    type: shippingInfoSchema,
    required: true
  },
  shippingAddressSnapshot: {
    type: shippingAddressSnapshotSchema,
    default: () => ({})
  },
  pickupAddressSnapshot: {
    type: pickupAddressSnapshotSchema,
    default: () => ({})
  },
  paymentMethod: {
    type: String,
    enum: ['UPI', 'UPI_QR', 'card', 'netbanking', 'wallet', 'COD'],
    required: true
  },
  paymentCaptureMode: {
    type: String,
    enum: ['automatic', 'manual'],
    default: 'automatic',
    index: true
  },
  paymentStatus: {
    type: String,
    enum: [
      'created',
      'pending',
      'pending_authorization',
      'pending_seller_confirmation',
      'authorized',
      'capture_pending',
      'captured',
      'paid',
      'failed',
      'authorization_released',
      'authorization_expired',
      'auto_refund_pending',
      'refunded',
      'refund_pending',
      'partially_refunded',
      'capture_failed'
    ],
    default: 'pending'
  },
  orderStatus: {
    type: String,
    enum: [
      'created',
      'pending',
      'payment_pending',
      'payment_authorization_pending',
      'placed',
      'payment_pending_confirmation',
      'awaiting_seller_acceptance',
      'seller_accepted',
      'confirmed',
      'processing',
      'shipped',
      'delivered',
      'partially_delivered',
      'cancelled',
      'return_requested',
      'return_approved',
      'return_rejected',
      'returned',
      'seller_rejected',
      'cancelled_unavailable',
      'acceptance_expired',
      'refunded'
    ],
    default: 'placed'
  },
  refundStatus: {
    type: String,
    enum: ['none', 'refund_pending', 'refund_processing', 'refunded', 'refund_failed', 'partially_refunded'],
    default: 'none',
    index: true
  },
  razorpayOrderId: {
    type: String,
    trim: true,
    default: '',
    index: true
  },
  razorpayPaymentId: {
    type: String,
    trim: true,
    default: ''
  },
  trackingNumber: {
    type: String,
    trim: true,
    default: ''
  },
  trackingCarrier: {
    type: String,
    trim: true,
    default: ''
  },
  trackingUrl: {
    type: String,
    trim: true,
    default: ''
  },
  shippingLabelUrl: {
    type: String,
    trim: true,
    default: ''
  },
  shiprocketOrderId: {
    type: Number,
    default: null
  },
  shiprocketShipmentId: {
    type: Number,
    default: null
  },
  shippedAt: {
    type: Date,
    default: null
  },
  deliveredAt: {
    type: Date,
    default: null
  },
  cancelledAt: {
    type: Date,
    default: null
  },
  cancelReason: {
    type: String,
    trim: true,
    default: ''
  },
  cancelInfo: {
    type: cancelInfoSchema,
    default: () => ({})
  },
  returnInfo: {
    type: returnInfoSchema,
    default: () => ({})
  },
  refundInfo: {
    type: refundInfoSchema,
    default: () => ({})
  },
  deliveryInfo: {
    type: deliveryInfoSchema,
    default: () => ({})
  },
  shiprocketRawData: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  sellerAcceptance: {
    type: sellerAcceptanceSchema,
    default: () => ({})
  },
  manualPaymentConfirmation: {
    type: manualPaymentConfirmationSchema,
    default: () => ({})
  },
  paymentFlow: {
    type: paymentFlowSchema,
    default: () => ({})
  },
  razorpay: {
    type: razorpayPaymentSchema,
    default: () => ({})
  },
  inventoryConfirmation: {
    type: inventoryConfirmationSchema,
    default: () => ({})
  },
  inventoryReservation: {
    type: inventoryReservationSchema,
    default: () => ({})
  },
  trackingStatus: {
    type: String,
    default: 'Order Confirmed'
  },
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  shipping: {
    type: Number,
    required: true,
    min: 0
  },
  finalTotal: {
    type: Number,
    required: true,
    min: 0
  },
  totalProductAmount: {
    type: Number,
    min: 0,
    default: 0
  },
  totalShippingAmount: {
    type: Number,
    min: 0,
    default: 0
  },
  totalPlatformCommission: {
    type: Number,
    min: 0,
    default: 0
  },
  totalSellerEarnings: {
    type: Number,
    min: 0,
    default: 0
  },
  totalRefundedAmount: {
    type: Number,
    min: 0,
    default: 0
  },
  totalNetAmount: {
    type: Number,
    min: 0,
    default: 0
  },
  commissionRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 1
  },
  commissionAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  sellerPayoutAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  payoutStatus: {
    type: String,
    enum: ['pending', 'scheduled', 'paid', 'failed', 'route_transfer_initiated', 'route_transfer_failed', 'released'],
    default: 'pending'
  },
  payoutDate: {
    type: Date,
    default: null
  },
  gstAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  gstRate: {
    type: Number,
    default: 0.18
  },
  razorpayTransfers: [{
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    transferId: {
      type: String,
      default: ''
    },
    amount: {
      type: Number,
      default: 0,
      min: 0
    },
    status: {
      type: String,
      enum: ['on_hold', 'released', 'failed'],
      default: 'on_hold'
    }
  }],
  emailSent: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

orderSchema.pre('save', function setUpdatedAt(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Order', orderSchema);
