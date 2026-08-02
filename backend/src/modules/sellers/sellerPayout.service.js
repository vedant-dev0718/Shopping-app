const AppError = require('../../utils/AppError');
const {
  addLinkedAccountBankAccount,
  createLinkedAccount
} = require('../../utils/razorpay');
const User = require('../users/user.model');
const Order = require('../orders/order.model');
const { toSellerOrderView } = require('../sellerOrders/sellerOrder.service');
const SellerProfile = require('./sellerProfile.model');

const getSellerProfile = async (sellerId) => {
  const profile = await SellerProfile.findOne({ userId: sellerId });

  if (!profile) {
    throw new AppError('Seller profile not found', 404);
  }

  return profile;
};

const assertBankDetailsComplete = (profile) => {
  const bankAccount = profile.bankAccount || {};

  if (
    !bankAccount.accountNumber
    || !bankAccount.ifscCode
    || !bankAccount.accountHolderName
    || !profile.panNumber
  ) {
    throw new AppError('Complete your bank account details before onboarding', 400);
  }
};

const onboardSellerToRazorpay = async (sellerId) => {
  const profile = await getSellerProfile(sellerId);

  assertBankDetailsComplete(profile);

  if (profile.razorpayLinkedAccountStatus === 'active') {
    throw new AppError('Already onboarded', 400);
  }

  const user = await User.findById(sellerId);

  if (!user) {
    throw new AppError('Seller user not found', 404);
  }

  let linkedAccountId = profile.razorpayLinkedAccountId;

  if (!linkedAccountId) {
    const linkedAccount = await createLinkedAccount({
      email: user.email,
      legalName: profile.storeName,
      businessType: 'individual',
      bankAccount: {
        panNumber: profile.panNumber,
        gstNumber: profile.gstNumber
      }
    });

    linkedAccountId = linkedAccount.id;
    profile.razorpayLinkedAccountId = linkedAccountId;
    profile.razorpayLinkedAccountStatus = 'created';
    await profile.save();
  }

  await addLinkedAccountBankAccount(linkedAccountId, {
    accountNumber: profile.bankAccount.accountNumber,
    ifscCode: profile.bankAccount.ifscCode,
    name: profile.bankAccount.accountHolderName
  });

  profile.razorpayLinkedAccountStatus = 'bank_added';
  await profile.save();

  return {
    linkedAccountId,
    status: 'bank_added'
  };
};

const activateSellerLinkedAccount = async (sellerId) => {
  const profile = await getSellerProfile(sellerId);

  profile.razorpayLinkedAccountStatus = 'active';
  await profile.save();

  return {
    linkedAccountId: profile.razorpayLinkedAccountId,
    status: profile.razorpayLinkedAccountStatus
  };
};

const roundMoney = (value) => Math.round(value * 100) / 100;

const getSellerEarnings = async (sellerId) => {
  const orders = await Order.find({
    'items.sellerId': sellerId,
    paymentStatus: 'paid'
  }).lean();

  const totals = orders.reduce((summary, order) => {
    const sellerOrder = toSellerOrderView(order, sellerId);
    const commissionRate = order.commissionRate || 0;
    const commission = sellerOrder.sellerSubtotal * commissionRate;
    const earned = sellerOrder.sellerSubtotal * (1 - commissionRate);

    summary.totalSold += sellerOrder.sellerSubtotal;
    summary.totalCommissionPaid += commission;
    summary.totalEarned += earned;

    if (order.payoutStatus === 'released') {
      summary.released += earned;
    } else {
      summary.onHold += earned;
    }

    return summary;
  }, {
    totalSold: 0,
    totalCommissionPaid: 0,
    totalEarned: 0,
    onHold: 0,
    released: 0,
    orderCount: orders.length
  });

  return {
    totalSold: roundMoney(totals.totalSold),
    totalCommissionPaid: roundMoney(totals.totalCommissionPaid),
    totalEarned: roundMoney(totals.totalEarned),
    onHold: roundMoney(totals.onHold),
    released: roundMoney(totals.released),
    orderCount: totals.orderCount
  };
};

const getSellerTransfers = async (sellerId) => {
  const orders = await Order.find({
    'items.sellerId': sellerId,
    paymentStatus: 'paid',
    razorpayTransfers: { $exists: true, $ne: [] }
  })
    .sort({ createdAt: -1 })
    .lean();

  return orders.flatMap((order) => {
    const sellerOrder = toSellerOrderView(order, sellerId);
    const commissionRate = order.commissionRate || 0;
    const sellerEarning = roundMoney(sellerOrder.sellerSubtotal * (1 - commissionRate));
    const sellerTransfers = (order.razorpayTransfers || []).filter((transfer) => {
      return transfer.sellerId && transfer.sellerId.toString() === sellerId.toString();
    });

    return sellerTransfers.map((transfer) => ({
      orderNumber: order.orderNumber,
      orderDate: order.createdAt,
      sellerEarning: transfer.amount || sellerEarning,
      payoutStatus: order.payoutStatus,
      transferId: transfer.transferId
    }));
  });
};

module.exports = {
  onboardSellerToRazorpay,
  activateSellerLinkedAccount,
  getSellerEarnings,
  getSellerTransfers
};
