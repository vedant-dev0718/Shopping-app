const roundMoney = (value) => Math.round((Number(value) || 0) * 100) / 100;

/** UPI intent string that clients render as a scannable QR. */
const buildUpiQrPayload = ({ upiId, storeName, amount }) => {
    if (!upiId) {
        return null;
    }

    const params = new URLSearchParams({
        pa: upiId,
        pn: storeName || 'Store',
        am: roundMoney(amount).toFixed(2),
        cu: 'INR'
    });

    return `upi://pay?${params.toString()}`;
};

/** Placeholder UPI handle so demo sellers can show a payment QR before real KYC. */
const buildDemoUpiId = (storeName) => {
    const handle = String(storeName || 'store')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .slice(0, 18);

    return `${handle || 'store'}@okaxis`;
};

module.exports = {
    buildUpiQrPayload,
    buildDemoUpiId
};
