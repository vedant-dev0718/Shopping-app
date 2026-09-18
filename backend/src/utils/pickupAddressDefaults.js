const pickupAddressPool = [
  {
    name: 'Jaipur Dispatch Desk',
    phone: '9876501001',
    address: 'Plot 12, Bapu Bazaar Fulfillment Lane',
    pincode: '302003',
    city: 'Jaipur',
    state: 'Rajasthan'
  },
  {
    name: 'Delhi Packing Studio',
    phone: '9876501002',
    address: 'Unit 4, Shahpur Jat Artisan Block',
    pincode: '110049',
    city: 'Delhi',
    state: 'Delhi'
  },
  {
    name: 'Mumbai Dispatch Hub',
    phone: '9876501003',
    address: 'Shop 18, Bandra Linking Road Market',
    pincode: '400050',
    city: 'Mumbai',
    state: 'Maharashtra'
  },
  {
    name: 'Chennai Packing Room',
    phone: '9876501004',
    address: 'No 22, T Nagar Textile Street',
    pincode: '600017',
    city: 'Chennai',
    state: 'Tamil Nadu'
  },
  {
    name: 'Bengaluru Fulfillment Table',
    phone: '9876501005',
    address: 'Unit 7, Indiranagar Craft Market',
    pincode: '560038',
    city: 'Bengaluru',
    state: 'Karnataka'
  },
  {
    name: 'Ahmedabad Pickup Counter',
    phone: '9876501006',
    address: 'Block C, Law Garden Handmade Market',
    pincode: '380006',
    city: 'Ahmedabad',
    state: 'Gujarat'
  }
];

const hashValue = (value = '') => value
  .split('')
  .reduce((total, char) => total + char.charCodeAt(0), 0);

const getDefaultPickupAddress = (seed = '') => {
  const index = hashValue(seed.toString()) % pickupAddressPool.length;
  const address = pickupAddressPool[index];

  return {
    name: address.name,
    phone: address.phone,
    address: address.address,
    pincode: address.pincode
  };
};

const getDefaultPickupLocationName = (sellerId) => `notwhat_${sellerId.toString().slice(-12)}`;

const hasPickupAddress = (profile = {}) => Boolean(
  profile.pickupAddress?.name
    && profile.pickupAddress?.phone
    && profile.pickupAddress?.address
    && profile.pickupAddress?.pincode
);

module.exports = {
  getDefaultPickupAddress,
  getDefaultPickupLocationName,
  hasPickupAddress
};
