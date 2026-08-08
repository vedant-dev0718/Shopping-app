// Run:
//   node scripts/backfill-bargain-bid-order-links.js --dry-run
//   node scripts/backfill-bargain-bid-order-links.js
//
// Purpose:
//   Repair historical bargain bids that were paid via checkout but were not linked
//   back to the created order (Bid.orderId), causing buyer UI to keep showing PAY NOW.

require('dotenv').config();
const mongoose = require('mongoose');

const env = require('../src/config/env');
const Bid = require('../src/modules/bargain/bid.model');
const Order = require('../src/modules/orders/order.model');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

const mapOrderPaymentStatusToBidPaymentStatus = (orderPaymentStatus) => {
    const normalized = String(orderPaymentStatus || '').toLowerCase();

    if (['paid', 'captured', 'partially_refunded'].includes(normalized)) {
        return 'captured';
    }

    if (normalized === 'refunded') {
        return 'refunded';
    }

    if (normalized === 'auto_refund_pending' || normalized === 'refund_pending') {
        return 'auto_refund_pending';
    }

    if (normalized === 'authorization_released') {
        return 'authorization_released';
    }

    if (normalized === 'authorization_expired') {
        return 'authorization_expired';
    }

    if (normalized === 'capture_failed') {
        return 'capture_failed';
    }

    if (normalized === 'failed') {
        return 'failed';
    }

    if (normalized === 'pending' || normalized === 'pending_authorization') {
        return 'pending_authorization';
    }

    if (normalized === 'authorized' || normalized === 'capture_pending') {
        return 'authorized';
    }

    return null;
};

const shouldMarkWon = (nextPaymentStatus) => {
    return ['captured', 'refunded', 'auto_refund_pending'].includes(nextPaymentStatus);
};

const pickBestOrder = (orders = []) => {
    if (!orders.length) {
        return null;
    }

    const weight = (status) => {
        const normalized = String(status || '').toLowerCase();
        if (normalized === 'refunded') return 6;
        if (normalized === 'partially_refunded') return 5;
        if (normalized === 'paid' || normalized === 'captured') return 4;
        if (normalized === 'auto_refund_pending' || normalized === 'refund_pending') return 3;
        if (normalized === 'authorized') return 2;
        return 1;
    };

    return [...orders].sort((a, b) => {
        const byStatus = weight(b.paymentStatus) - weight(a.paymentStatus);
        if (byStatus !== 0) return byStatus;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    })[0];
};

const findMatchingOrder = async (bid) => {
    if (bid.orderId) {
        const existingOrder = await Order.findById(bid.orderId)
            .select('_id buyerId razorpayOrderId razorpayPaymentId paymentStatus paymentFlow razorpay createdAt')
            .lean();
        if (existingOrder) {
            return existingOrder;
        }
    }

    const orderIdKey = String(bid.razorpayOrderId || bid.razorpay?.orderId || '').trim();
    const paymentIdKey = String(bid.razorpayPaymentId || bid.razorpay?.paymentId || '').trim();

    if (!orderIdKey && !paymentIdKey) {
        return null;
    }

    const matchQuery = {
        buyerId: bid.buyerId,
        $or: []
    };

    if (orderIdKey) {
        matchQuery.$or.push({ razorpayOrderId: orderIdKey });
        matchQuery.$or.push({ 'paymentFlow.razorpayOrderId': orderIdKey });
    }

    if (paymentIdKey) {
        matchQuery.$or.push({ razorpayPaymentId: paymentIdKey });
        matchQuery.$or.push({ 'paymentFlow.razorpayPaymentId': paymentIdKey });
    }

    if (matchQuery.$or.length === 0) {
        return null;
    }

    const orders = await Order.find(matchQuery)
        .select('_id buyerId razorpayOrderId razorpayPaymentId paymentStatus paymentFlow razorpay createdAt')
        .lean();

    return pickBestOrder(orders);
};

const run = async () => {
    await mongoose.connect(env.mongoUri);

    const candidateFilter = {
        $and: [
            {
                $or: [
                    { orderId: null },
                    { paymentStatus: { $in: ['pending', 'pending_authorization', 'authorized', 'failed', 'capture_failed'] } }
                ]
            },
            {
                $or: [
                    { razorpayOrderId: { $ne: '' } },
                    { 'razorpay.orderId': { $ne: '' } },
                    { razorpayPaymentId: { $ne: '' } },
                    { 'razorpay.paymentId': { $ne: '' } }
                ]
            }
        ]
    };

    const candidates = await Bid.find(candidateFilter);

    let scanned = 0;
    let matched = 0;
    let updated = 0;
    let skippedNoOrder = 0;
    let skippedNoChange = 0;

    console.log(`Starting bargain bid/order backfill${dryRun ? ' (dry-run)' : ''}. Candidates: ${candidates.length}`);

    for (const bid of candidates) {
        scanned += 1;

        const order = await findMatchingOrder(bid);
        if (!order) {
            skippedNoOrder += 1;
            continue;
        }

        matched += 1;

        const nextPaymentStatus = mapOrderPaymentStatusToBidPaymentStatus(order.paymentStatus);

        const expectedOrderId = String(order._id);
        const currentOrderId = bid.orderId ? String(bid.orderId) : '';
        const shouldUpdateOrderId = expectedOrderId !== currentOrderId;

        const shouldUpdatePayment = Boolean(nextPaymentStatus) && nextPaymentStatus !== bid.paymentStatus;
        const shouldUpdateBidStatus = shouldMarkWon(nextPaymentStatus) && bid.bidStatus !== 'won';

        const captureTimestamp = order.paymentFlow?.capturedAt || order.razorpay?.capturedAt || order.createdAt || new Date();
        const captureAmount = Math.round(((Number(bid.amount) || 0) * (Number(bid.quantity) || 0)) * 100);

        const shouldSetCaptureMeta =
            nextPaymentStatus === 'captured'
            && (!bid.razorpay?.capturedAt || !bid.razorpay?.captureAmount || Number(bid.razorpay?.captureAmount) <= 0);

        if (!shouldUpdateOrderId && !shouldUpdatePayment && !shouldUpdateBidStatus && !shouldSetCaptureMeta) {
            skippedNoChange += 1;
            continue;
        }

        if (!dryRun) {
            bid.orderId = order._id;

            if (shouldUpdatePayment && nextPaymentStatus) {
                bid.paymentStatus = nextPaymentStatus;
            }

            if (shouldUpdateBidStatus) {
                bid.bidStatus = 'won';
            }

            if (shouldSetCaptureMeta) {
                bid.razorpay = {
                    ...(bid.razorpay || {}),
                    capturedAt: bid.razorpay?.capturedAt || captureTimestamp,
                    captureAmount: bid.razorpay?.captureAmount || captureAmount,
                    captureFailureReason: ''
                };
            }

            await bid.save();
        }

        updated += 1;
    }

    console.log('Bargain bid/order backfill complete.');
    console.log(`Scanned: ${scanned}`);
    console.log(`Matched to order: ${matched}`);
    console.log(`Updated: ${updated}`);
    console.log(`Skipped (no matching order): ${skippedNoOrder}`);
    console.log(`Skipped (already correct): ${skippedNoChange}`);

    await mongoose.disconnect();
};

run().catch(async (error) => {
    console.error('Bargain bid/order backfill failed:', error.message);
    await mongoose.disconnect().catch(() => { });
    process.exit(1);
});
