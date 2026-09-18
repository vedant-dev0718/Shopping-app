const nodemailer = require('nodemailer');

const env = require('../config/env');

const transporter = nodemailer.createTransport({
  host: env.emailHost,
  port: env.emailPort,
  secure: env.emailPort === 465,
  auth: env.emailUser && env.emailPassword
    ? {
      user: env.emailUser,
      pass: env.emailPassword
    }
    : undefined
});

const sendEmail = async ({ to, subject, html }) => {
  try {
    return await transporter.sendMail({
      from: env.emailFrom,
      to,
      subject,
      html
    });
  } catch (error) {
    console.error('Failed to send email:', error.message);
    return null;
  }
};

const sendEmailSafe = async (email) => {
  try {
    return await sendEmail(email);
  } catch (_error) {
    return null;
  }
};

module.exports = {
  sendEmail,
  sendEmailSafe
};
