const nock = require('nock');

const SHIPROCKET_BASE_URL = 'https://apiv2.shiprocket.in';

const mockShiprocketAuth = (token = 'shiprocket-token') => nock(SHIPROCKET_BASE_URL)
  .post('/v1/external/auth/login')
  .reply(200, { token });

const mockServiceability = (couriers = [{ courier_company_id: 1, courier_name: 'Mock Courier' }]) => nock(SHIPROCKET_BASE_URL)
  .get('/v1/external/courier/serviceability/')
  .query(true)
  .reply(200, { data: { available_courier_companies: couriers } });

const mockPickupLocation = (response = {}, status = 200) => nock(SHIPROCKET_BASE_URL)
  .post('/v1/external/settings/company/addpickup')
  .reply(status, status >= 400 ? response : { success: true, ...response });

const mockShipmentCreate = (response = {}) => nock(SHIPROCKET_BASE_URL)
  .post('/v1/external/orders/create/adhoc')
  .reply(200, {
    order_id: 101,
    shipment_id: 202,
    ...response
  });

const mockAssignAwb = (awbCode = 'AWB123') => nock(SHIPROCKET_BASE_URL)
  .post('/v1/external/courier/assign/awb')
  .reply(200, {
    awb_assign_status: 1,
    response: { data: { awb_code: awbCode } }
  });

const mockLabel = (labelUrl = 'https://example.com/label.pdf') => nock(SHIPROCKET_BASE_URL)
  .post('/v1/external/orders/print/label')
  .reply(200, { label_url: labelUrl });

module.exports = {
  mockShiprocketAuth,
  mockServiceability,
  mockPickupLocation,
  mockShipmentCreate,
  mockAssignAwb,
  mockLabel
};
