const axios = require('axios');

const env = require('../config/env');

const BASE_URL = 'https://apiv2.shiprocket.in/v1/external';

let cachedToken = null;
let tokenExpiresAt = null;

const getToken = async () => {
  if (cachedToken && tokenExpiresAt && Date.now() < tokenExpiresAt) {
    return cachedToken;
  }

  if (!env.shiprocketEmail || !env.shiprocketPassword) {
    throw new Error('Shiprocket credentials are not configured');
  }

  const res = await axios.post(`${BASE_URL}/auth/login`, {
    email: env.shiprocketEmail,
    password: env.shiprocketPassword
  });

  cachedToken = res.data.token;
  tokenExpiresAt = Date.now() + 23 * 60 * 60 * 1000;
  return cachedToken;
};

const client = async () => {
  const token = await getToken();
  return axios.create({
    baseURL: BASE_URL,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
  });
};

const registerPickupLocation = async (locationData) => {
  const http = await client();
  const res = await http.post('/settings/company/addpickup', locationData);
  return res.data;
};

const createOrder = async (orderPayload) => {
  const http = await client();
  const res = await http.post('/orders/create/adhoc', orderPayload);
  return res.data;
};

const getServiceability = async (pickupPincode, deliveryPincode, weight, cod) => {
  const http = await client();
  const res = await http.get('/courier/serviceability/', {
    params: {
      pickup_postcode: pickupPincode,
      delivery_postcode: deliveryPincode,
      weight,
      cod: cod ? 1 : 0
    }
  });
  return res.data;
};

const assignAwb = async (shipmentId, courierId) => {
  const http = await client();
  const res = await http.post('/courier/assign/awb', {
    shipment_id: String(shipmentId),
    courier_id: String(courierId)
  });
  return res.data;
};

const generateLabel = async (shipmentId) => {
  const http = await client();
  const res = await http.post('/orders/print/label', {
    shipment_id: [shipmentId]
  });
  return res.data;
};

module.exports = {
  registerPickupLocation,
  createOrder,
  getServiceability,
  assignAwb,
  generateLabel
};
