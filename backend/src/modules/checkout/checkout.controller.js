const env = require('../../config/env');
const { successResponse } = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const checkoutService = require('./checkout.service');

const startCheckout = asyncHandler(async (req, res) => {
  const checkout = await checkoutService.startCheckout(req.user.id);

  return successResponse(res, {
    message: 'Checkout started successfully',
    data: checkout
  });
});

const verifyAndPlaceOrder = asyncHandler(async (req, res) => {
  const confirmation = await checkoutService.verifyAndPlaceOrder(
    req.body.razorpayOrderId,
    req.body.razorpayPaymentId,
    req.body.razorpaySignature,
    req.user.id,
    {
      deliveryAddressId: req.body.deliveryAddressId,
      shippingInfo: req.body.shippingInfo
    },
    req.body.paymentMethod
  );

  return successResponse(res, {
    statusCode: 201,
    message: 'Payment verified and order placed successfully',
    data: confirmation
  });
});

// Serves an HTML page that opens the Razorpay payment sheet.
// iOS loads this in a WKWebView — no pod installation needed.
const razorpayWebCheckout = (req, res) => {
  const { orderId, amount, name, email, phone, color } = req.query;

  if (!orderId || !amount) {
    return res.status(400).send('orderId and amount are required');
  }

  const keyId = env.razorpayKeyId || '';
  const themeColor = color || '#6C63FF';

  const safeName = (name || '').replace(/"/g, '&quot;');
  const safeEmail = (email || '').replace(/"/g, '&quot;');
  const safePhone = (phone || '').replace(/"/g, '&quot;');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #f5f5f5; display: flex; align-items: center; justify-content: center; min-height: 100vh; font-family: -apple-system, sans-serif; }
    .loading { text-align: center; color: #666; }
    .dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: ${themeColor}; margin: 0 3px; animation: bounce 1.2s infinite; }
    .dot:nth-child(2) { animation-delay: 0.2s; }
    .dot:nth-child(3) { animation-delay: 0.4s; }
    @keyframes bounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }
    .error { text-align: center; color: #c0392b; font-size: 14px; padding: 20px; display: none; }
  </style>
</head>
<body>
  <div class="loading" id="loader">
    <div><span class="dot"></span><span class="dot"></span><span class="dot"></span></div>
    <p style="margin-top:12px; font-size:14px;">Opening payment...</p>
  </div>
  <div class="error" id="errMsg">Payment could not be opened. Please go back and try again.</div>
  <script>
    function postFailed(code, description) {
      try {
        window.webkit.messageHandlers.razorpayFailed.postMessage(
          JSON.stringify({ code: code, description: description })
        );
      } catch(e) {}
      document.getElementById('loader').style.display = 'none';
      document.getElementById('errMsg').style.display = 'block';
    }

    function initRazorpay() {
      try {
        var options = {
          key: "${keyId}",
          amount: ${parseInt(amount, 10)},
          currency: "INR",
          order_id: "${orderId}",
          name: "NotWhat",
          description: "Order Payment",
          prefill: {
            name: "${safeName}",
            email: "${safeEmail}",
            contact: "${safePhone}"
          },
          theme: { color: "${themeColor}" },
          handler: function(response) {
            try {
              window.webkit.messageHandlers.razorpaySuccess.postMessage(JSON.stringify({
                razorpayPaymentId: response.razorpay_payment_id,
                razorpayOrderId: response.razorpay_order_id,
                razorpaySignature: response.razorpay_signature
              }));
            } catch(e) {}
          },
          modal: {
            ondismiss: function() {
              try { window.webkit.messageHandlers.razorpayDismissed.postMessage("dismissed"); } catch(e) {}
            }
          }
        };
        var rzp = new Razorpay(options);
        rzp.on("payment.failed", function(response) {
          postFailed(
            (response.error && response.error.code) || "PAYMENT_FAILED",
            (response.error && response.error.description) || "Payment failed"
          );
        });
        rzp.open();
      } catch(e) {
        postFailed("INIT_ERROR", e.message || "Failed to initialise payment");
      }
    }

    var script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = initRazorpay;
    script.onerror = function() {
      postFailed("SCRIPT_LOAD_ERROR", "Could not load payment gateway. Check your internet connection.");
    };
    document.head.appendChild(script);
  </script>
</body>
</html>`;

  return res.send(html);
};

module.exports = {
  startCheckout,
  verifyAndPlaceOrder,
  razorpayWebCheckout
};
