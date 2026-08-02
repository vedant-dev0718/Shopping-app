const formatCurrency = (amount = 0) => `₹${Number(amount || 0).toFixed(2)}`;

const escapeHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const buildAddressHtml = (shippingInfo = {}) => `
  <p>
    ${escapeHtml(shippingInfo.name)}<br>
    ${escapeHtml(shippingInfo.address)}<br>
    ${escapeHtml(shippingInfo.city)}, ${escapeHtml(shippingInfo.state)} ${escapeHtml(shippingInfo.postalCode)}<br>
    Phone: ${escapeHtml(shippingInfo.phone)}<br>
    Email: ${escapeHtml(shippingInfo.email)}
  </p>
`;

const buildItemRows = (items = []) => items.map((item) => `
  <tr>
    <td>${escapeHtml(item.titleSnapshot || item.title || 'Item')}</td>
    <td>${item.quantity || 0}</td>
    <td>${formatCurrency(item.priceSnapshot || item.amount || 0)}</td>
    <td>${formatCurrency(item.itemTotal || ((item.quantity || 0) * (item.priceSnapshot || 0)))}</td>
  </tr>
`).join('');

const buildOrderConfirmationEmail = (order) => ({
  to: order.shippingInfo.email,
  subject: `Order confirmed: ${order.orderNumber}`,
  html: `
    <h1>Your NotWhat order is confirmed</h1>
    <p>Order number: <strong>${escapeHtml(order.orderNumber)}</strong></p>
    <table cellpadding="8" cellspacing="0" border="1">
      <thead>
        <tr>
          <th align="left">Item</th>
          <th align="left">Qty</th>
          <th align="left">Price</th>
          <th align="left">Total</th>
        </tr>
      </thead>
      <tbody>${buildItemRows(order.items)}</tbody>
    </table>
    <p>Subtotal: <strong>${formatCurrency(order.subtotal)}</strong></p>
    <p>Shipping: <strong>${formatCurrency(order.shipping)}</strong></p>
    <p>Price (incl. ${Math.round((order.gstRate || 0.18) * 100)}% GST): <strong>${formatCurrency(order.finalTotal)}</strong></p>
    <p>GST Amount: <strong>${formatCurrency(order.gstAmount)}</strong></p>
    <h2>Shipping address</h2>
    ${buildAddressHtml(order.shippingInfo)}
    <p>Expected delivery: 5-7 business days</p>
    <p>Payment method: ${escapeHtml(order.paymentMethod)}</p>
  `
});

const buildNewOrderAlertEmail = (order, sellerEmail, sellerItems, sellerSubtotal, commissionRate) => {
  const commissionAmount = Math.round(sellerSubtotal * commissionRate * 100) / 100;
  const sellerEarnings = Math.round((sellerSubtotal - commissionAmount) * 100) / 100;

  return {
    to: sellerEmail,
    subject: `New NotWhat order: ${order.orderNumber}`,
    html: `
      <h1>You have a new order!</h1>
      <p>Order number: <strong>${escapeHtml(order.orderNumber)}</strong></p>
      <table cellpadding="8" cellspacing="0" border="1">
        <thead>
          <tr>
            <th align="left">Item</th>
            <th align="left">Qty</th>
            <th align="left">Price</th>
            <th align="left">Total</th>
          </tr>
        </thead>
        <tbody>${buildItemRows(sellerItems)}</tbody>
      </table>
      <h2>Earnings breakdown</h2>
      <p>Your Items Total: <strong>${formatCurrency(sellerSubtotal)}</strong></p>
      <p>Platform Commission: <strong>${formatCurrency(commissionAmount)}</strong> (${Math.round(commissionRate * 100)}%)</p>
      <p>Your Earnings: <strong>${formatCurrency(sellerEarnings)}</strong></p>
      <p>Your earnings are held in your Razorpay account and will be released 7 days after delivery confirmation.</p>
      <h2>Buyer shipping address</h2>
      ${buildAddressHtml(order.shippingInfo)}
    `
  };
};

const buildBidWonEmail = (bid, product, buyerEmail) => ({
  to: buyerEmail,
  subject: `You won the Bargain: ${product.title}`,
  html: `
    <h1>You won the Bargain!</h1>
    <p>Product: <strong>${escapeHtml(product.title)}</strong></p>
    <p>Winning bid amount: <strong>${formatCurrency(bid.amount)}</strong></p>
    <p>Your payment has been captured.</p>
  `
});

const buildBidLostEmail = (bid, product, buyerEmail) => ({
  to: buyerEmail,
  subject: `Bargain update: ${product.title}`,
  html: `
    <h1>Your bid was not selected</h1>
    <p>Product: <strong>${escapeHtml(product.title)}</strong></p>
    <p>Bid amount: <strong>${formatCurrency(bid.amount)}</strong></p>
    <p>No charge was captured. The blocked amount will unblock automatically within 5 days.</p>
  `
});

module.exports = {
  buildOrderConfirmationEmail,
  buildNewOrderAlertEmail,
  buildBidWonEmail,
  buildBidLostEmail
};
