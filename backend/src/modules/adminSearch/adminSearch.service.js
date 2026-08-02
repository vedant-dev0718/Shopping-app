const mongoose = require('mongoose');

const User = require('../users/user.model');
const SellerProfile = require('../sellers/sellerProfile.model');
const Store = require('../stores/store.model');
const Product = require('../products/product.model');
const Reel = require('../reels/reel.model');
const Comment = require('../comments/comment.model');
const Order = require('../orders/order.model');
const Refund = require('../refunds/refund.model');
const ReturnRequest = require('../returns/return.model');
const SupportRequest = require('../contact/supportRequest.model');
const Report = require('../safety/report.model');
const ModerationAction = require('../safety/moderationAction.model');
const BlockedUser = require('../safety/blockedUser.model');
const SellerPayout = require('../finance/sellerPayout.model');
const AdminActionLog = require('../adminManagement/adminActionLog.model');
const ContentPage = require('../content/contentPage.model');
const AppSetting = require('../adminTools/appSetting.model');
const Category = require('../adminTools/category.model');
const Region = require('../adminTools/region.model');

const LIMIT = 12;

const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildRegex = (q = '') => {
  const trimmed = q.trim();
  return trimmed ? new RegExp(escapeRegex(trimmed), 'i') : null;
};

const objectIdOrNull = (value = '') => (
  mongoose.Types.ObjectId.isValid(value) ? new mongoose.Types.ObjectId(value) : null
);

const numberOrNull = (value = '') => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const dateMatch = ({ fromDate, toDate } = {}) => {
  if (!fromDate && !toDate) {
    return {};
  }

  const createdAt = {};
  if (fromDate) createdAt.$gte = new Date(fromDate);
  if (toDate) createdAt.$lte = new Date(toDate);
  return { createdAt };
};

const maybeStatus = (field, status) => (status ? { [field]: status } : {});

const normalizeType = (type = 'all') => ({
  actionLogs: 'actions',
  adminActionLogs: 'actions',
  moderationActions: 'moderation',
  blockedUsers: 'blocks',
  legal: 'content',
  pages: 'content',
  appSettings: 'settings',
  featuredContent: 'featured'
}[type] || type || 'all');

const shouldRun = (requestedType, type) => !requestedType || requestedType === 'all' || requestedType === type;

const leanMap = (items, mapper) => items.map(mapper);

const search = async ({ q = '', type = 'all', status = '', fromDate, toDate } = {}) => {
  const regex = buildRegex(q);
  const maybeObjectId = objectIdOrNull(q);
  const maybeNumber = numberOrNull(q);
  const dates = dateMatch({ fromDate, toDate });
  const requestedType = normalizeType(type);

  const results = {
    users: [],
    sellers: [],
    stores: [],
    products: [],
    reels: [],
    comments: [],
    orders: [],
    payments: [],
    refunds: [],
    returns: [],
    shipments: [],
    payouts: [],
    support: [],
    reports: [],
    blocks: [],
    moderation: [],
    actions: [],
    content: [],
    settings: [],
    categories: [],
    regions: [],
    featured: []
  };

  const tasks = [];

  if (shouldRun(requestedType, 'users')) {
    const query = {
      ...dates,
      ...maybeStatus('accountStatus', status),
      ...(regex ? { $or: [{ name: regex }, { email: regex }, { phone: regex }] } : {})
    };
    if (maybeObjectId) query.$or = [...(query.$or || []), { _id: maybeObjectId }];

    tasks.push(User.find(query)
      .select('name email phone role accountStatus isAdmin adminPermissions lastLoginAt createdAt updatedAt')
      .sort({ createdAt: -1 })
      .limit(LIMIT)
      .lean()
      .then((items) => {
        results.users = items;
      }));
  }

  if (shouldRun(requestedType, 'sellers')) {
    const matchingUserIds = regex
      ? await User.distinct('_id', { $or: [{ name: regex }, { email: regex }, { phone: regex }] })
      : [];
    const query = {
      ...dates,
      ...(regex ? { $or: [{ storeName: regex }, { city: regex }, { state: regex }, { specialtyRegion: regex }, { userId: { $in: matchingUserIds } }] } : {})
    };
    if (status) query.kycStatus = status;
    if (maybeObjectId) query.$or = [...(query.$or || []), { _id: maybeObjectId }, { userId: maybeObjectId }, { storeId: maybeObjectId }];

    tasks.push(SellerProfile.find(query)
      .select('userId storeId storeName storeCategory city state specialtyRegion kycStatus razorpayLinkedAccountStatus createdAt updatedAt')
      .populate('userId', 'name email phone accountStatus')
      .sort({ createdAt: -1 })
      .limit(LIMIT)
      .lean()
      .then((items) => {
        results.sellers = items;
      }));
  }

  if (shouldRun(requestedType, 'stores')) {
    const query = {
      ...dates,
      ...(regex ? { $or: [{ storeName: regex }, { city: regex }, { state: regex }, { region: regex }, { category: regex }] } : {})
    };
    if (status === 'verified') query.verified = true;
    if (status === 'pending') query.verified = false;
    if (maybeObjectId) query.$or = [...(query.$or || []), { _id: maybeObjectId }, { sellerId: maybeObjectId }];

    tasks.push(Store.find(query)
      .select('sellerId storeName category city state region verified viewCount createdAt')
      .sort({ createdAt: -1 })
      .limit(LIMIT)
      .lean()
      .then((items) => {
        results.stores = items;
      }));
  }

  if (shouldRun(requestedType, 'products')) {
    const query = {
      ...dates,
      ...maybeStatus('status', status),
      ...(regex ? { $or: [{ title: regex }, { description: regex }, { category: regex }, { region: regex }, { tags: regex }, { productLink: regex }, { sku: regex }, { barcode: regex }] } : {})
    };
    if (maybeObjectId) query.$or = [...(query.$or || []), { _id: maybeObjectId }, { sellerId: maybeObjectId }, { storeId: maybeObjectId }];

    tasks.push(Product.find(query)
      .select('sellerId storeId title category region price stock sku barcode status imageUrls saveCount clickCount createdAt')
      .sort({ createdAt: -1 })
      .limit(LIMIT)
      .lean()
      .then((items) => {
        results.products = items;
      }));
  }

  if (shouldRun(requestedType, 'reels')) {
    const query = {
      ...dates,
      ...maybeStatus('status', status),
      ...(regex ? { $or: [{ caption: regex }, { hashtags: regex }, { region: regex }, { category: regex }, { videoPublicId: regex }] } : {})
    };
    if (maybeObjectId) query.$or = [...(query.$or || []), { _id: maybeObjectId }, { sellerId: maybeObjectId }, { storeId: maybeObjectId }, { productIds: maybeObjectId }];

    tasks.push(Reel.find(query)
      .select('sellerId storeId caption region category status viewCount likeCount commentCount thumbnailUrl createdAt')
      .sort({ createdAt: -1 })
      .limit(LIMIT)
      .lean()
      .then((items) => {
        results.reels = items;
      }));
  }

  if (shouldRun(requestedType, 'comments')) {
    const query = {
      ...dates,
      ...(regex ? { text: regex } : {})
    };
    if (maybeObjectId) query.$or = [{ _id: maybeObjectId }, { reelId: maybeObjectId }, { sellerId: maybeObjectId }, { userId: maybeObjectId }];

    tasks.push(Comment.find(query)
      .select('reelId sellerId userId text createdAt')
      .populate('userId', 'name email role accountStatus')
      .sort({ createdAt: -1 })
      .limit(LIMIT)
      .lean()
      .then((items) => {
        results.comments = items;
      }));
  }

  if (shouldRun(requestedType, 'orders') || shouldRun(requestedType, 'payments') || shouldRun(requestedType, 'shipments')) {
    const orderOr = regex ? [
      { orderNumber: regex },
      { razorpayOrderId: regex },
      { razorpayPaymentId: regex },
      { trackingNumber: regex },
      { trackingCarrier: regex },
      { 'shippingInfo.name': regex },
      { 'shippingInfo.email': regex },
      { 'shippingInfo.phone': regex },
      { 'shippingInfo.city': regex },
      { 'shippingInfo.state': regex },
      { 'items.titleSnapshot': regex }
    ] : [];
    if (maybeObjectId) {
      orderOr.push(
        { _id: maybeObjectId },
        { buyerId: maybeObjectId },
        { sellerIds: maybeObjectId },
        { 'items.sellerId': maybeObjectId },
        { 'items.productId': maybeObjectId },
        { 'items.storeId': maybeObjectId }
      );
    }
    if (maybeNumber !== null) {
      orderOr.push(
        { shiprocketOrderId: maybeNumber },
        { shiprocketShipmentId: maybeNumber },
        { 'items.shiprocketOrderId': maybeNumber },
        { 'items.shiprocketShipmentId': maybeNumber }
      );
    }

    const baseOrderQuery = {
      ...dates,
      ...(orderOr.length > 0 ? { $or: orderOr } : {})
    };

    if (shouldRun(requestedType, 'orders')) {
      tasks.push(Order.find({
        ...baseOrderQuery,
        ...maybeStatus('orderStatus', status)
      })
        .select('orderNumber buyerId sellerIds paymentStatus orderStatus finalTotal razorpayOrderId razorpayPaymentId trackingNumber trackingCarrier shiprocketShipmentId createdAt')
        .sort({ createdAt: -1 })
        .limit(LIMIT)
        .lean()
        .then((items) => {
          results.orders = items;
        }));
    }

    if (shouldRun(requestedType, 'payments')) {
      const paymentOr = baseOrderQuery.$or?.length
        ? baseOrderQuery.$or
        : [
          { razorpayOrderId: { $ne: '' } },
          { razorpayPaymentId: { $ne: '' } },
          { 'paymentFlow.razorpayOrderId': { $ne: '' } },
          { 'paymentFlow.razorpayPaymentId': { $ne: '' } }
        ];
      tasks.push(Order.find({
        ...baseOrderQuery,
        ...(status ? { paymentStatus: status } : {}),
        $or: paymentOr
      })
        .select('orderNumber paymentStatus finalTotal razorpayOrderId razorpayPaymentId paymentFlow.razorpayOrderId paymentFlow.razorpayPaymentId refundStatus createdAt')
        .sort({ createdAt: -1 })
        .limit(LIMIT)
        .lean()
        .then((items) => {
          results.payments = items;
        }));
    }

    if (shouldRun(requestedType, 'shipments')) {
      const shipmentOr = baseOrderQuery.$or?.length
        ? baseOrderQuery.$or
        : [
          { shiprocketShipmentId: { $ne: null } },
          { shiprocketOrderId: { $ne: null } },
          { trackingNumber: { $ne: '' } },
          { 'items.shiprocketShipmentId': { $ne: null } },
          { 'items.itemTrackingNumber': { $ne: '' } }
        ];
      tasks.push(Order.find({
        ...baseOrderQuery,
        ...(status ? { orderStatus: status } : {}),
        $or: shipmentOr
      })
        .select('orderNumber orderStatus trackingNumber trackingCarrier trackingUrl shiprocketOrderId shiprocketShipmentId shippingLabelUrl createdAt')
        .sort({ createdAt: -1 })
        .limit(LIMIT)
        .lean()
        .then((items) => {
          results.shipments = items;
        }));
    }
  }

  if (shouldRun(requestedType, 'refunds')) {
    const query = {
      ...dates,
      ...maybeStatus('status', status),
      ...(regex ? { $or: [{ razorpayPaymentId: regex }, { razorpayRefundId: regex }, { reason: regex }, { failureReason: regex }] } : {})
    };
    if (maybeObjectId) query.$or = [...(query.$or || []), { _id: maybeObjectId }, { orderId: maybeObjectId }, { buyerId: maybeObjectId }, { sellerId: maybeObjectId }];
    tasks.push(Refund.find(query)
      .select('orderId buyerId sellerId razorpayPaymentId razorpayRefundId amount currency reason status failureReason createdAt updatedAt')
      .sort({ createdAt: -1 })
      .limit(LIMIT)
      .lean()
      .then((items) => {
        results.refunds = items;
      }));
  }

  if (shouldRun(requestedType, 'returns')) {
    const query = {
      ...dates,
      ...maybeStatus('status', status),
      ...(regex ? { $or: [{ reason: regex }, { description: regex }, { 'items.titleSnapshot': regex }] } : {})
    };
    if (maybeObjectId) query.$or = [...(query.$or || []), { _id: maybeObjectId }, { orderId: maybeObjectId }, { buyerId: maybeObjectId }, { sellerId: maybeObjectId }, { 'items.productId': maybeObjectId }];
    tasks.push(ReturnRequest.find(query)
      .select('orderId buyerId sellerId reason description status refundAmount refundStatus requestedAt resolvedAt')
      .sort({ requestedAt: -1 })
      .limit(LIMIT)
      .lean()
      .then((items) => {
        results.returns = items;
      }));
  }

  if (shouldRun(requestedType, 'support')) {
    const query = {
      ...dates,
      ...maybeStatus('status', status),
      ...(regex ? { $or: [{ name: regex }, { email: regex }, { subject: regex }, { message: regex }, { orderNumber: regex }] } : {})
    };
    if (maybeObjectId) query.$or = [...(query.$or || []), { _id: maybeObjectId }, { userId: maybeObjectId }];
    tasks.push(SupportRequest.find(query)
      .select('userId name email subject message orderNumber status createdAt updatedAt')
      .sort({ createdAt: -1 })
      .limit(LIMIT)
      .lean()
      .then((items) => {
        results.support = items;
      }));
  }

  if (shouldRun(requestedType, 'reports')) {
    const query = {
      ...dates,
      ...maybeStatus('status', status),
      ...(regex ? { $or: [{ reason: regex }, { details: regex }, { targetType: regex }] } : {})
    };
    if (maybeObjectId) query.$or = [...(query.$or || []), { _id: maybeObjectId }, { reporterId: maybeObjectId }, { targetId: maybeObjectId }, { targetOwnerId: maybeObjectId }, { resolvedBy: maybeObjectId }];
    tasks.push(Report.find(query)
      .select('reporterId targetType targetId targetOwnerId reason details status resolvedBy resolvedAt resolutionNote createdAt')
      .sort({ createdAt: -1 })
      .limit(LIMIT)
      .lean()
      .then((items) => {
        results.reports = items;
      }));
  }

  if (shouldRun(requestedType, 'moderation')) {
    const query = {
      ...dates,
      ...(status ? { action: status } : {}),
      ...(regex ? { $or: [{ action: regex }, { note: regex }, { targetType: regex }] } : {})
    };
    if (maybeObjectId) query.$or = [...(query.$or || []), { _id: maybeObjectId }, { adminId: maybeObjectId }, { reportId: maybeObjectId }, { targetId: maybeObjectId }];
    tasks.push(ModerationAction.find(query)
      .select('adminId reportId targetType targetId action note createdAt')
      .sort({ createdAt: -1 })
      .limit(LIMIT)
      .lean()
      .then((items) => {
        results.moderation = items;
      }));
  }

  if (shouldRun(requestedType, 'payouts')) {
    const query = {
      ...dates,
      ...maybeStatus('status', status),
      ...(regex ? { $or: [{ payoutNumber: regex }, { transactionReference: regex }, { paymentMethod: regex }, { notes: regex }] } : {})
    };
    if (maybeObjectId) query.$or = [...(query.$or || []), { _id: maybeObjectId }, { sellerId: maybeObjectId }];

    tasks.push(SellerPayout.find(query)
      .select('sellerId payoutNumber amount status paymentMethod transactionReference notes periodStart periodEnd paidAt createdAt updatedAt')
      .populate('sellerId', 'name email phone accountStatus')
      .sort({ createdAt: -1 })
      .limit(LIMIT)
      .lean()
      .then((items) => {
        results.payouts = items;
      }));
  }

  if (shouldRun(requestedType, 'blocks')) {
    const matchingUserIds = regex
      ? await User.distinct('_id', { $or: [{ name: regex }, { email: regex }, { phone: regex }] })
      : [];
    const query = { ...dates };
    if (maybeObjectId) query.$or = [{ _id: maybeObjectId }, { blockerId: maybeObjectId }, { blockedUserId: maybeObjectId }];
    if (matchingUserIds.length) query.$or = [...(query.$or || []), { blockerId: { $in: matchingUserIds } }, { blockedUserId: { $in: matchingUserIds } }];

    tasks.push(BlockedUser.find(query)
      .select('blockerId blockedUserId createdAt')
      .populate('blockerId', 'name email phone accountStatus')
      .populate('blockedUserId', 'name email phone accountStatus')
      .sort({ createdAt: -1 })
      .limit(LIMIT)
      .lean()
      .then((items) => {
        results.blocks = items;
      }));
  }

  if (shouldRun(requestedType, 'actions')) {
    const query = {
      ...dates,
      ...(status ? { actionType: status } : {}),
      ...(regex ? { $or: [{ actionType: regex }, { targetType: regex }, { reason: regex }] } : {})
    };
    if (maybeObjectId) query.$or = [...(query.$or || []), { _id: maybeObjectId }, { adminId: maybeObjectId }, { targetId: maybeObjectId }];

    tasks.push(AdminActionLog.find(query)
      .select('adminId actionType targetType targetId reason metadata createdAt')
      .populate('adminId', 'name email role accountStatus')
      .sort({ createdAt: -1 })
      .limit(LIMIT)
      .lean()
      .then((items) => {
        results.actions = items;
      }));
  }

  if (shouldRun(requestedType, 'content')) {
    const query = {
      ...dates,
      ...(status ? { isPublished: status === 'published' || status === 'true' } : {}),
      ...(regex ? { $or: [{ slug: regex }, { title: regex }, { 'sections.heading': regex }, { 'sections.body': regex }] } : {})
    };

    tasks.push(ContentPage.find(query)
      .select('slug title lastUpdated isPublished updatedBy createdAt updatedAt')
      .sort({ slug: 1 })
      .limit(LIMIT)
      .lean()
      .then((items) => {
        results.content = items;
      }));
  }

  if (shouldRun(requestedType, 'settings')) {
    const query = {
      ...dates,
      ...(status ? { type: status } : {}),
      ...(regex ? { $or: [{ key: regex }, { type: regex }, { description: regex }] } : {})
    };

    tasks.push(AppSetting.find(query)
      .select('key value type description updatedBy createdAt updatedAt')
      .sort({ key: 1 })
      .limit(LIMIT)
      .lean()
      .then((items) => {
        results.settings = items;
      }));
  }

  if (shouldRun(requestedType, 'categories')) {
    const query = {
      ...dates,
      ...(status ? { isEnabled: status === 'enabled' || status === 'true' } : {}),
      ...(regex ? { $or: [{ name: regex }, { slug: regex }, { description: regex }] } : {})
    };
    if (maybeObjectId) query.$or = [...(query.$or || []), { _id: maybeObjectId }];

    tasks.push(Category.find(query)
      .select('name slug description isEnabled sortOrder updatedBy createdAt updatedAt')
      .sort({ sortOrder: 1, name: 1 })
      .limit(LIMIT)
      .lean()
      .then((items) => {
        results.categories = items;
      }));
  }

  if (shouldRun(requestedType, 'regions')) {
    const query = {
      ...dates,
      ...(status ? { isEnabled: status === 'enabled' || status === 'true' } : {}),
      ...(regex ? { $or: [{ name: regex }, { slug: regex }, { state: regex }, { description: regex }] } : {})
    };
    if (maybeObjectId) query.$or = [...(query.$or || []), { _id: maybeObjectId }];

    tasks.push(Region.find(query)
      .select('name slug state description isEnabled sortOrder updatedBy createdAt updatedAt')
      .sort({ sortOrder: 1, name: 1 })
      .limit(LIMIT)
      .lean()
      .then((items) => {
        results.regions = items;
      }));
  }

  if (shouldRun(requestedType, 'featured')) {
    const featureQueries = [];
    const productQuery = { featured: true, ...(regex ? { $or: [{ title: regex }, { sku: regex }, { barcode: regex }, { category: regex }, { region: regex }] } : {}) };
    const storeQuery = { featured: true, ...(regex ? { $or: [{ storeName: regex }, { category: regex }, { region: regex }, { city: regex }, { state: regex }] } : {}) };
    const reelQuery = { featured: true, ...(regex ? { $or: [{ caption: regex }, { hashtags: regex }, { category: regex }, { region: regex }] } : {}) };
    if (maybeObjectId) {
      productQuery.$or = [...(productQuery.$or || []), { _id: maybeObjectId }, { sellerId: maybeObjectId }, { storeId: maybeObjectId }];
      storeQuery.$or = [...(storeQuery.$or || []), { _id: maybeObjectId }, { sellerId: maybeObjectId }];
      reelQuery.$or = [...(reelQuery.$or || []), { _id: maybeObjectId }, { sellerId: maybeObjectId }, { storeId: maybeObjectId }];
    }
    featureQueries.push(Product.find(productQuery).select('title category region price status featured createdAt').limit(4).lean().then((items) => items.map((item) => ({ ...item, featuredType: 'product' }))));
    featureQueries.push(Store.find(storeQuery).select('storeName category city state region verified featured createdAt').limit(4).lean().then((items) => items.map((item) => ({ ...item, featuredType: 'store' }))));
    featureQueries.push(Reel.find(reelQuery).select('caption category region status viewCount featured createdAt').limit(4).lean().then((items) => items.map((item) => ({ ...item, featuredType: 'reel' }))));

    tasks.push(Promise.all(featureQueries).then((groups) => {
      results.featured = groups.flat().slice(0, LIMIT);
    }));
  }

  await Promise.all(tasks);

  return {
    query: q || '',
    type: requestedType,
    status: status || '',
    results: leanMap(Object.entries(results), ([key, value]) => ({ key, count: value.length })).reduce((acc, item) => {
      acc[item.key] = results[item.key];
      return acc;
    }, {})
  };
};

module.exports = {
  search
};
