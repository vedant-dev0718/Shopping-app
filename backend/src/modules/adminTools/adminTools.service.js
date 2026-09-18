const mongoose = require('mongoose');

const AppError = require('../../utils/AppError');
const User = require('../users/user.model');
const Product = require('../products/product.model');
const Reel = require('../reels/reel.model');
const Store = require('../stores/store.model');
const Comment = require('../comments/comment.model');
const Order = require('../orders/order.model');
const Report = require('../safety/report.model');
const BlockedUser = require('../safety/blockedUser.model');
const ModerationAction = require('../safety/moderationAction.model');
const SupportRequest = require('../contact/supportRequest.model');
const ContentPage = require('../content/contentPage.model');
const AdminActionLog = require('../adminManagement/adminActionLog.model');
const AppSetting = require('./appSetting.model');
const Category = require('./category.model');
const Region = require('./region.model');

const cleanUserSelect = 'name email phone role accountStatus createdAt';
const reportActions = [
  'dismissed',
  'dismiss_report',
  'hide_content',
  'content_hidden',
  'content_removed',
  'user_warned',
  'user_suspended',
  'suspend_user',
  'user_banned'
];
const supportStatuses = ['open', 'in_progress', 'waiting_on_user', 'resolved', 'closed'];

const defaultSettings = [
  { key: 'platformCommissionPercentage', value: 10, type: 'number', description: 'Default platform commission percentage for seller orders.' },
  { key: 'sellerAcceptanceWindowMinutes', value: 1440, type: 'number', description: 'Minutes sellers have to accept an order before it expires.' },
  { key: 'returnWindowDays', value: 7, type: 'number', description: 'Default buyer return window after delivery.' },
  { key: 'refundLiveModeEnabled', value: false, type: 'boolean', description: 'Whether live payment-provider refunds are enabled.' },
  { key: 'shiprocketLiveShipmentEnabled', value: false, type: 'boolean', description: 'Whether live Shiprocket shipment creation is enabled.' },
  { key: 'lowStockDefaultThreshold', value: 3, type: 'number', description: 'Default threshold for low-stock alerts.' },
  { key: 'featuredCategories', value: [], type: 'array', description: 'Category slugs highlighted in discovery.' },
  { key: 'enabledRegions', value: [], type: 'array', description: 'Region slugs enabled in discovery and seller tooling.' },
  { key: 'supportEmail', value: 'support@notwhat.in', type: 'string', description: 'Public support contact email.' },
  { key: 'appMaintenanceMode', value: false, type: 'boolean', description: 'Whether the app should show maintenance state.' },
  { key: 'minimumAppVersion', value: '1.0', type: 'string', description: 'Minimum supported app version.' }
];

const defaultContentPages = [
  { slug: 'privacy-policy', title: 'Privacy Policy' },
  { slug: 'terms-of-service', title: 'Terms of Service' },
  { slug: 'return-policy', title: 'Return Policy' },
  { slug: 'shipping-policy', title: 'Shipping Policy' },
  { slug: 'about', title: 'About NotWhat' },
  { slug: 'faq', title: 'FAQ' },
  { slug: 'contact-support', title: 'Contact Support Information' }
];

const toObjectId = (id) => new mongoose.Types.ObjectId(id);

const slugify = (value = '') => value
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

const asNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const pagination = (query = {}) => {
  const page = Math.max(asNumber(query.page, 1), 1);
  const limit = Math.min(Math.max(asNumber(query.limit, 20), 1), 100);
  return { page, limit, skip: (page - 1) * limit };
};

const dateRange = (query = {}, field = 'createdAt') => {
  const range = {};
  if (query.fromDate) {
    range.$gte = new Date(query.fromDate);
  }
  if (query.toDate) {
    const to = new Date(query.toDate);
    if (/^\d{4}-\d{2}-\d{2}$/.test(query.toDate)) {
      to.setHours(23, 59, 59, 999);
    }
    range.$lte = to;
  }
  return Object.keys(range).length ? { [field]: range } : {};
};

const pageResult = async (model, filter, query, options = {}) => {
  const { page, limit, skip } = pagination(query);
  const [items, total] = await Promise.all([
    model.find(filter)
      .sort(options.sort || { createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate(options.populate || [])
      .lean(),
    model.countDocuments(filter)
  ]);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1
    }
  };
};

const logAction = (adminId, actionType, targetType, targetId, reason = '', metadata = {}) => AdminActionLog.create({
  adminId,
  actionType,
  targetType,
  targetId,
  reason,
  metadata
});

const ensureDefaultSettings = async () => {
  await Promise.all(defaultSettings.map((setting) => AppSetting.updateOne(
    { key: setting.key },
    { $setOnInsert: setting },
    { upsert: true }
  )));
};

const ensureDefaultContentPages = async () => {
  await Promise.all(defaultContentPages.map((page) => ContentPage.updateOne(
    { slug: page.slug },
    {
      $setOnInsert: {
        ...page,
        lastUpdated: new Date(),
        sections: [],
        isPublished: true
      }
    },
    { upsert: true }
  )));
};

const getTargetPreview = async (targetType, targetId) => {
  if (!targetId) return null;

  const id = targetId;
  if (targetType === 'product') {
    const product = await Product.findById(id).select('title description status imageUrls sellerId storeId category region').populate('sellerId', cleanUserSelect).populate('storeId', 'storeName').lean();
    return product ? { type: 'product', title: product.title, status: product.status, preview: product.description, data: product } : null;
  }
  if (targetType === 'reel') {
    const reel = await Reel.findById(id).select('caption status thumbnailUrl videoUrl sellerId storeId viewCount likeCount commentCount').populate('sellerId', cleanUserSelect).populate('storeId', 'storeName').lean();
    return reel ? { type: 'reel', title: reel.caption || 'Reel', status: reel.status, preview: reel.thumbnailUrl || reel.videoUrl, data: reel } : null;
  }
  if (targetType === 'comment') {
    const comment = await Comment.findById(id).populate('userId', cleanUserSelect).populate('reelId', 'caption').lean();
    return comment ? { type: 'comment', title: comment.text, status: comment.status, preview: comment.text, data: comment } : null;
  }
  if (targetType === 'store') {
    const store = await Store.findById(id).populate('sellerId', cleanUserSelect).lean();
    return store ? { type: 'store', title: store.storeName, status: store.status, preview: store.description, data: store } : null;
  }
  if (targetType === 'user') {
    const user = await User.findById(id).select(cleanUserSelect).lean();
    return user ? { type: 'user', title: user.name || user.email, status: user.accountStatus, preview: user.email, data: user } : null;
  }

  return null;
};

const listReports = async (query = {}) => {
  const filter = { ...dateRange(query) };
  if (query.status) filter.status = query.status;
  if (query.targetType) filter.targetType = query.targetType;
  if (query.reason) filter.reason = query.reason;
  if (query.reporterId) filter.reporterId = query.reporterId;
  if (query.targetId) filter.targetId = query.targetId;

  return pageResult(Report, filter, query, {
    populate: [
      { path: 'reporterId', select: cleanUserSelect },
      { path: 'targetOwnerId', select: cleanUserSelect },
      { path: 'resolvedBy', select: cleanUserSelect }
    ],
    sort: { createdAt: -1 }
  });
};

const getReportDetail = async (reportId) => {
  const report = await Report.findById(reportId)
    .populate('reporterId', cleanUserSelect)
    .populate('targetOwnerId', cleanUserSelect)
    .populate('resolvedBy', cleanUserSelect)
    .lean();

  if (!report) {
    throw new AppError('Report not found', 404);
  }

  const [targetPreview, previousReportsAgainstSameTarget, previousReportsBySameReporter, adminActionsHistory] = await Promise.all([
    getTargetPreview(report.targetType, report.targetId),
    Report.find({ _id: { $ne: report._id }, targetType: report.targetType, targetId: report.targetId }).sort({ createdAt: -1 }).limit(25).populate('reporterId', cleanUserSelect).lean(),
    Report.find({ _id: { $ne: report._id }, reporterId: report.reporterId?._id || report.reporterId }).sort({ createdAt: -1 }).limit(25).lean(),
    ModerationAction.find({ $or: [{ reportId: report._id }, { targetType: report.targetType, targetId: report.targetId }] }).sort({ createdAt: -1 }).populate('adminId', cleanUserSelect).lean()
  ]);

  return {
    reportId: report._id,
    reporter: report.reporterId,
    targetType: report.targetType,
    targetId: report.targetId,
    targetOwner: report.targetOwnerId,
    targetContentPreview: targetPreview,
    reason: report.reason,
    description: report.details,
    status: report.status,
    createdAt: report.createdAt,
    resolvedBy: report.resolvedBy,
    resolvedAt: report.resolvedAt,
    resolutionNote: report.resolutionNote,
    previousReportsAgainstSameTarget,
    previousReportsBySameReporter,
    adminActionsHistory
  };
};

const targetUserIdForReport = (report) => (report.targetType === 'user' ? report.targetId : report.targetOwnerId);

const applyModerationAction = async (report, action) => {
  if (action === 'hide_content') {
    if (report.targetType === 'product') await Product.updateOne({ _id: report.targetId }, { status: 'inactive', featured: false });
    if (report.targetType === 'reel') await Reel.updateOne({ _id: report.targetId }, { status: 'hidden', featured: false });
    if (report.targetType === 'comment') await Comment.updateOne({ _id: report.targetId }, { text: '[removed by moderation]', status: 'hidden' });
    if (report.targetType === 'store') await Store.updateOne({ _id: report.targetId }, { verified: false, status: 'hidden', featured: false });
  }

  if (action === 'content_hidden') {
    if (report.targetType === 'product') await Product.updateOne({ _id: report.targetId }, { status: 'hidden', featured: false });
    if (report.targetType === 'reel') await Reel.updateOne({ _id: report.targetId }, { status: 'hidden', featured: false });
    if (report.targetType === 'comment') await Comment.updateOne({ _id: report.targetId }, { status: 'hidden' });
    if (report.targetType === 'store') await Store.updateOne({ _id: report.targetId }, { status: 'hidden', featured: false });
  }

  if (action === 'content_removed') {
    if (report.targetType === 'product') await Product.updateOne({ _id: report.targetId }, { status: 'inactive', featured: false });
    if (report.targetType === 'reel') await Reel.updateOne({ _id: report.targetId }, { status: 'removed', featured: false });
    if (report.targetType === 'comment') await Comment.updateOne({ _id: report.targetId }, { status: 'deleted', deletedAt: new Date() });
    if (report.targetType === 'store') await Store.updateOne({ _id: report.targetId }, { status: 'hidden', featured: false });
  }

  if (action === 'user_suspended' || action === 'suspend_user' || action === 'user_banned') {
    const userId = targetUserIdForReport(report);
    if (userId) {
      await User.updateOne(
        { _id: userId, accountStatus: { $ne: 'deleted' } },
        { accountStatus: action === 'user_banned' ? 'banned' : 'suspended', authInvalidatedAt: new Date() }
      );
    }
  }
};

const resolveReport = async (adminId, reportId, data = {}) => {
  const action = data.action;
  if (!reportActions.includes(action)) {
    throw new AppError('Invalid moderation action', 400);
  }

  const report = await Report.findById(reportId);
  if (!report) {
    throw new AppError('Report not found', 404);
  }

  await applyModerationAction(report, action);

  const moderationAction = await ModerationAction.create({
    adminId,
    reportId: report._id,
    targetType: report.targetType,
    targetId: report.targetId,
    action,
    note: data.note || ''
  });

  report.status = ['dismissed', 'dismiss_report'].includes(action) ? 'dismissed' : 'resolved';
  report.resolvedBy = adminId;
  report.resolvedAt = new Date();
  report.resolutionNote = data.note || '';
  report.moderationActionId = moderationAction._id;
  await report.save();

  await logAction(adminId, `report_${action}`, 'report', report._id, data.note || '', {
    targetType: report.targetType,
    targetId: report.targetId,
    moderationActionId: moderationAction._id
  });

  return getReportDetail(report._id);
};

const listModerationActions = (query = {}) => pageResult(ModerationAction, dateRange(query), query, {
  populate: [
    { path: 'adminId', select: cleanUserSelect },
    { path: 'reportId' }
  ],
  sort: { createdAt: -1 }
});

const listBlockedUsers = (query = {}) => pageResult(BlockedUser, dateRange(query), query, {
  populate: [
    { path: 'blockerId', select: cleanUserSelect },
    { path: 'blockedUserId', select: cleanUserSelect }
  ],
  sort: { createdAt: -1 }
});

const listSupportRequests = async (query = {}) => {
  const filter = { ...dateRange(query) };
  if (query.status) filter.status = query.status;
  if (query.assignedAdminId) filter.assignedAdminId = query.assignedAdminId;
  if (query.q) {
    const term = new RegExp(query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: term }, { email: term }, { subject: term }, { message: term }, { orderNumber: term }];
  }

  return pageResult(SupportRequest, filter, query, {
    populate: [
      { path: 'userId', select: cleanUserSelect },
      { path: 'assignedAdminId', select: cleanUserSelect }
    ],
    sort: { createdAt: -1 }
  });
};

const getSupportDetail = async (requestId) => {
  const request = await SupportRequest.findById(requestId)
    .populate('userId', cleanUserSelect)
    .populate('assignedAdminId', cleanUserSelect)
    .populate('replies.adminId', cleanUserSelect)
    .lean();

  if (!request) {
    throw new AppError('Support request not found', 404);
  }

  const [relatedOrder, actionHistory] = await Promise.all([
    request.orderNumber ? Order.findOne({ orderNumber: request.orderNumber }).lean() : null,
    AdminActionLog.find({ targetType: 'support', targetId: request._id }).sort({ createdAt: -1 }).populate('adminId', cleanUserSelect).lean()
  ]);

  return {
    request,
    user: request.userId,
    email: request.email,
    subject: request.subject,
    message: request.message,
    orderNumber: request.orderNumber,
    relatedOrder,
    status: request.status,
    assignedAdmin: request.assignedAdminId,
    replies: request.replies || [],
    createdAt: request.createdAt,
    actionHistory
  };
};

const updateSupportStatus = async (adminId, requestId, data = {}) => {
  if (!supportStatuses.includes(data.status)) {
    throw new AppError('Invalid support status', 400);
  }

  const request = await SupportRequest.findById(requestId);
  if (!request) throw new AppError('Support request not found', 404);

  const previousStatus = request.status;
  request.status = data.status;
  await request.save();
  await logAction(adminId, 'support_status_change', 'support', request._id, data.reason || '', { previousStatus, status: request.status });

  return getSupportDetail(request._id);
};

const replySupportRequest = async (adminId, requestId, data = {}) => {
  if (!data.message || !data.message.trim()) {
    throw new AppError('Reply message is required', 400);
  }

  const request = await SupportRequest.findById(requestId);
  if (!request) throw new AppError('Support request not found', 404);

  request.replies.push({ adminId, message: data.message.trim() });
  if (request.status === 'open') request.status = 'in_progress';
  await request.save();
  await logAction(adminId, 'support_reply', 'support', request._id, data.message.trim(), { replyCount: request.replies.length });

  return getSupportDetail(request._id);
};

const assignSupportRequest = async (adminId, requestId, data = {}) => {
  const assigneeId = data.assignedAdminId || adminId;
  const admin = await User.findOne({ _id: assigneeId, role: 'admin' }).lean();
  if (!admin) throw new AppError('Assigned admin not found', 404);

  const request = await SupportRequest.findById(requestId);
  if (!request) throw new AppError('Support request not found', 404);

  const previousAssignedAdminId = request.assignedAdminId;
  request.assignedAdminId = assigneeId;
  if (request.status === 'open') request.status = 'in_progress';
  await request.save();
  await logAction(adminId, 'support_assigned', 'support', request._id, data.reason || '', { previousAssignedAdminId, assignedAdminId: assigneeId });

  return getSupportDetail(request._id);
};

const listContentPages = async () => {
  await ensureDefaultContentPages();
  return ContentPage.find().sort({ slug: 1 }).populate('updatedBy', cleanUserSelect).lean();
};

const getContentPage = async (slug) => {
  await ensureDefaultContentPages();
  const page = await ContentPage.findOne({ slug }).populate('updatedBy', cleanUserSelect).lean();
  if (!page) throw new AppError('Content page not found', 404);
  return page;
};

const updateContentPage = async (adminId, slug, data = {}) => {
  await ensureDefaultContentPages();
  const page = await ContentPage.findOne({ slug });
  if (!page) throw new AppError('Content page not found', 404);

  const previousTitle = page.title;
  if (data.title !== undefined) page.title = data.title;
  if (data.sections !== undefined) page.sections = data.sections;
  if (data.isPublished !== undefined) page.isPublished = Boolean(data.isPublished);
  page.lastUpdated = new Date();
  page.updatedBy = adminId;
  await page.save();

  await logAction(adminId, 'content_page_updated', 'content', page._id, data.reason || '', { slug, previousTitle, title: page.title });
  return getContentPage(slug);
};

const listSettings = async () => {
  await ensureDefaultSettings();
  return AppSetting.find().sort({ key: 1 }).populate('updatedBy', cleanUserSelect).lean();
};

const coerceSettingValue = (setting, value) => {
  if (setting.type === 'number') {
    const number = Number(value);
    if (!Number.isFinite(number)) throw new AppError('Setting value must be a number', 400);
    return number;
  }
  if (setting.type === 'boolean') {
    if (typeof value === 'boolean') return value;
    if (value === 'true') return true;
    if (value === 'false') return false;
    throw new AppError('Setting value must be a boolean', 400);
  }
  if (setting.type === 'array' && !Array.isArray(value)) {
    throw new AppError('Setting value must be an array', 400);
  }
  if (setting.type === 'object' && (!value || typeof value !== 'object' || Array.isArray(value))) {
    throw new AppError('Setting value must be an object', 400);
  }
  return value;
};

const updateSetting = async (adminId, key, data = {}) => {
  await ensureDefaultSettings();
  const setting = await AppSetting.findOne({ key });
  if (!setting) throw new AppError('Setting not found', 404);

  const previousValue = setting.value;
  if (data.value === undefined) throw new AppError('Setting value is required', 400);
  setting.value = coerceSettingValue(setting, data.value);
  if (data.description !== undefined) setting.description = data.description;
  setting.updatedBy = adminId;
  await setting.save();
  await logAction(adminId, 'setting_changed', 'setting', setting._id, data.reason || '', { key, previousValue, value: setting.value });

  return AppSetting.findById(setting._id).populate('updatedBy', cleanUserSelect).lean();
};

const listTaxonomy = (Model) => Model.find().sort({ sortOrder: 1, name: 1 }).populate('updatedBy', cleanUserSelect).lean();

const createTaxonomy = async (adminId, Model, targetType, data = {}) => {
  if (!data.name || !data.name.trim()) throw new AppError('Name is required', 400);
  const doc = await Model.create({
    name: data.name.trim(),
    slug: data.slug ? slugify(data.slug) : slugify(data.name),
    state: data.state || '',
    description: data.description || '',
    isEnabled: data.isEnabled !== undefined ? Boolean(data.isEnabled) : true,
    sortOrder: Number(data.sortOrder || 0),
    updatedBy: adminId
  });
  await logAction(adminId, `${targetType}_created`, targetType, doc._id, data.reason || '', { name: doc.name, slug: doc.slug });
  return doc;
};

const updateTaxonomy = async (adminId, Model, targetType, id, data = {}) => {
  const doc = await Model.findById(id);
  if (!doc) throw new AppError(`${targetType} not found`, 404);
  const previous = doc.toObject();
  if (data.name !== undefined) doc.name = data.name.trim();
  if (data.slug !== undefined) doc.slug = slugify(data.slug);
  if (data.state !== undefined && targetType === 'region') doc.state = data.state;
  if (data.description !== undefined) doc.description = data.description;
  if (data.isEnabled !== undefined) doc.isEnabled = Boolean(data.isEnabled);
  if (data.sortOrder !== undefined) doc.sortOrder = Number(data.sortOrder);
  doc.updatedBy = adminId;
  await doc.save();
  await logAction(adminId, `${targetType}_updated`, targetType, doc._id, data.reason || '', { previous, current: doc.toObject() });
  return doc;
};

const deleteTaxonomy = async (adminId, Model, targetType, id, reason = '') => {
  const doc = await Model.findByIdAndDelete(id);
  if (!doc) throw new AppError(`${targetType} not found`, 404);
  await logAction(adminId, `${targetType}_deleted`, targetType, doc._id, reason, { name: doc.name, slug: doc.slug });
  return { deleted: true, id };
};

const listFeatured = async () => {
  const [stores, products, reels] = await Promise.all([
    Store.find({ featured: true }).sort({ updatedAt: -1, createdAt: -1 }).limit(100).populate('sellerId', cleanUserSelect).lean(),
    Product.find({ featured: true }).sort({ updatedAt: -1, createdAt: -1 }).limit(100).populate('sellerId', cleanUserSelect).populate('storeId').lean(),
    Reel.find({ featured: true }).sort({ updatedAt: -1, createdAt: -1 }).limit(100).populate('sellerId', cleanUserSelect).populate('storeId').lean()
  ]);

  return { stores, products, reels };
};

const setFeatured = async (adminId, type, id, featured, reason = '') => {
  const modelMap = { stores: Store, products: Product, reels: Reel };
  const singularMap = { stores: 'store', products: 'product', reels: 'reel' };
  const Model = modelMap[type];
  if (!Model) throw new AppError('Invalid featured content type', 400);
  const doc = await Model.findById(id);
  if (!doc) throw new AppError(`${singularMap[type]} not found`, 404);

  const previousFeatured = doc.featured;
  doc.featured = Boolean(featured);
  await doc.save();
  await logAction(
    adminId,
    `${singularMap[type]}_${featured ? 'featured' : 'unfeatured'}`,
    singularMap[type],
    doc._id,
    reason,
    { previousFeatured, featured: doc.featured }
  );

  return doc;
};

module.exports = {
  listReports,
  getReportDetail,
  resolveReport,
  listModerationActions,
  listBlockedUsers,
  listSupportRequests,
  getSupportDetail,
  updateSupportStatus,
  replySupportRequest,
  assignSupportRequest,
  listContentPages,
  getContentPage,
  updateContentPage,
  listSettings,
  updateSetting,
  listCategories: () => listTaxonomy(Category),
  createCategory: (adminId, data) => createTaxonomy(adminId, Category, 'category', data),
  updateCategory: (adminId, id, data) => updateTaxonomy(adminId, Category, 'category', id, data),
  deleteCategory: (adminId, id, reason) => deleteTaxonomy(adminId, Category, 'category', id, reason),
  listRegions: () => listTaxonomy(Region),
  createRegion: (adminId, data) => createTaxonomy(adminId, Region, 'region', data),
  updateRegion: (adminId, id, data) => updateTaxonomy(adminId, Region, 'region', id, data),
  deleteRegion: (adminId, id, reason) => deleteTaxonomy(adminId, Region, 'region', id, reason),
  listFeatured,
  setFeatured
};
