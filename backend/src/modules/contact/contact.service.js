const SupportRequest = require('./supportRequest.model');

const submitSupportRequest = async (user, data) => {
  const supportRequest = await SupportRequest.create({
    userId: user ? user.id : null,
    name: data.name,
    email: data.email,
    subject: data.subject,
    message: data.message,
    orderNumber: data.orderNumber || '',
    status: 'open'
  });

  return {
    supportRequestId: supportRequest._id,
    status: supportRequest.status,
    createdAt: supportRequest.createdAt
  };
};

module.exports = {
  submitSupportRequest
};
