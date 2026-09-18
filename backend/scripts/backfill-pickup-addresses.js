// Run: node scripts/backfill-pickup-addresses.js
// Adds stable demo pickup addresses to seller profiles that do not have one.

require('dotenv').config();
const mongoose = require('mongoose');

const env = require('../src/config/env');
const SellerProfile = require('../src/modules/sellers/sellerProfile.model');
const {
  getDefaultPickupAddress,
  getDefaultPickupLocationName,
  hasPickupAddress
} = require('../src/utils/pickupAddressDefaults');

const run = async () => {
  await mongoose.connect(env.mongoUri);

  const profiles = await SellerProfile.find({});
  let updatedCount = 0;
  let skippedCount = 0;

  for (const profile of profiles) {
    if (hasPickupAddress(profile)) {
      skippedCount += 1;
      continue;
    }

    profile.pickupAddress = getDefaultPickupAddress(profile.userId || profile._id);
    profile.shiprocketPickupName = profile.shiprocketPickupName || getDefaultPickupLocationName(profile.userId || profile._id);
    await profile.save();
    updatedCount += 1;
  }

  console.log(`Pickup address backfill complete. Updated: ${updatedCount}. Already set: ${skippedCount}.`);
  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error('Pickup address backfill failed:', error.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
