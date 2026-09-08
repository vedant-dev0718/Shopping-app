const axios = require('axios');

const env = require('../config/env');

const RESEND_API_URL = 'https://api.resend.com/emails';
const RESEND_REQUEST_TIMEOUT_MS = 10_000;

const sendResendEmail = async ({ to, subject, html }) => {
  if (!env.resendApiKey) {
    if (env.nodeEnv !== 'production') {
      return { skipped: true, reason: 'Resend API key is not configured' };
    }
    throw new Error('Resend API key is not configured');
  }

  const response = await axios.post(
    RESEND_API_URL,
    {
      from: env.emailFrom,
      to,
      subject,
      html
    },
    {
      headers: {
        Authorization: `Bearer ${env.resendApiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: RESEND_REQUEST_TIMEOUT_MS
    }
  );

  return response.data;
};

const escapeHtml = (value = '') => value
  .toString()
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const signupOtpHtml = ({ name, otp, ttlMinutes }) => `
  <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827">
    <h2 style="margin:0 0 12px">Verify your NotWhat email</h2>
    <p>Hi ${escapeHtml(name || 'there')},</p>
    <p>Use this code to finish creating your NotWhat account:</p>
    <p style="font-size:28px;font-weight:700;letter-spacing:6px;margin:20px 0">${escapeHtml(otp)}</p>
    <p>This code expires in ${ttlMinutes} minutes. If you did not request this, you can ignore this email.</p>
  </div>
`;

const sendSignupOtpEmail = ({ to, name, otp, ttlMinutes }) => sendResendEmail({
  to,
  subject: 'Verify your NotWhat email',
  html: signupOtpHtml({ name, otp, ttlMinutes })
});

const passwordResetOtpHtml = ({ name, otp, ttlMinutes }) => `
  <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827">
    <h2 style="margin:0 0 12px">Reset your NotWhat password</h2>
    <p>Hi ${escapeHtml(name || 'there')},</p>
    <p>Use this code to reset your NotWhat password:</p>
    <p style="font-size:28px;font-weight:700;letter-spacing:6px;margin:20px 0">${escapeHtml(otp)}</p>
    <p>This code expires in ${ttlMinutes} minutes. If you did not request this, you can ignore this email.</p>
  </div>
`;

const sendPasswordResetOtpEmail = ({ to, name, otp, ttlMinutes }) => sendResendEmail({
  to,
  subject: 'Reset your NotWhat password',
  html: passwordResetOtpHtml({ name, otp, ttlMinutes })
});

module.exports = {
  sendResendEmail,
  sendSignupOtpEmail,
  sendPasswordResetOtpEmail
};
