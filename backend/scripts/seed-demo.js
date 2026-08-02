// Run: node scripts/seed-demo.js
// Seeds one demo seller, one demo buyer, a store, and 5 products.
// Prints credentials to use in the app.

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const env = require('../src/config/env');
const User = require('../src/modules/users/user.model');
const Store = require('../src/modules/stores/store.model');
const SellerProfile = require('../src/modules/sellers/sellerProfile.model');
const Product = require('../src/modules/products/product.model');
const { getDefaultPickupAddress, hasPickupAddress } = require('../src/utils/pickupAddressDefaults');

const SELLER_EMAIL = 'seller@notwhat.test';
const SELLER_PASSWORD = 'Test@1234';
const BUYER_EMAIL = 'buyer@notwhat.test';
const BUYER_PASSWORD = 'Test@1234';

const products = [
  {
    title: 'Handwoven Banarasi Silk Scarf',
    description: 'Pure silk scarf handwoven by artisans in Varanasi. Gold zari border, traditional motifs.',
    category: 'Textiles',
    region: 'Uttar Pradesh',
    price: 1499,
    stock: 10,
    tags: ['silk', 'banarasi', 'scarf', 'handwoven'],
    imageUrls: ['https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=600']
  },
  {
    title: 'Blue Pottery Decorative Plate',
    description: 'Authentic Jaipur blue pottery plate, hand-painted with floral patterns. Perfect for home decor.',
    category: 'Pottery',
    region: 'Rajasthan',
    price: 850,
    stock: 15,
    tags: ['blue pottery', 'jaipur', 'decorative', 'handmade'],
    imageUrls: ['https://images.unsplash.com/photo-1610701596061-2ecf227e85b2?w=600']
  },
  {
    title: 'Madhubani Art Canvas',
    description: 'Original Madhubani painting on canvas. Depicts traditional folk motifs from Bihar.',
    category: 'Art',
    region: 'Bihar',
    price: 2200,
    stock: 5,
    tags: ['madhubani', 'folk art', 'canvas', 'painting'],
    imageUrls: ['https://images.unsplash.com/photo-1578926375605-eaf7559b1458?w=600']
  },
  {
    title: 'Kutch Embroidered Tote Bag',
    description: 'Handcrafted cotton tote with intricate Kutch mirror embroidery. Spacious and durable.',
    category: 'Bags',
    region: 'Gujarat',
    price: 699,
    stock: 20,
    tags: ['kutch', 'embroidery', 'tote', 'bag', 'mirror work'],
    imageUrls: ['https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600']
  },
  {
    title: 'Channapatna Wooden Toy Set',
    description: 'Set of 5 traditional Channapatna lacquered wooden toys. Safe for children, eco-friendly.',
    category: 'Toys',
    region: 'Karnataka',
    price: 540,
    stock: 30,
    tags: ['channapatna', 'wooden toys', 'traditional', 'lacquer'],
    imageUrls: ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600']
  }
];

async function seed() {
  await mongoose.connect(env.mongoUri);
  console.log('Connected to MongoDB\n');

  // ── Seller ──────────────────────────────────────────────────────────────────
  let seller = await User.findOne({ email: SELLER_EMAIL });
  if (!seller) {
    const passwordHash = await bcrypt.hash(SELLER_PASSWORD, 10);
    seller = await User.create({
      name: 'Demo Seller',
      email: SELLER_EMAIL,
      passwordHash,
      role: 'seller',
      phone: '9876543210'
    });
    console.log('✓ Seller user created');
  } else {
    console.log('↩ Seller already exists, skipping');
  }

  // ── Store ────────────────────────────────────────────────────────────────────
  let store = await Store.findOne({ sellerId: seller._id });
  if (!store) {
    store = await Store.create({
      sellerId: seller._id,
      storeName: 'NotWhat Demo Store',
      category: 'Handicrafts',
      city: 'Delhi',
      state: 'Delhi',
      region: 'North India',
      description: 'A curated collection of authentic Indian handicrafts sourced directly from artisans.',
      verified: true
    });
    console.log('✓ Store created');
  } else {
    console.log('↩ Store already exists, skipping');
  }

  // ── Seller Profile ───────────────────────────────────────────────────────────
  let sellerProfile = await SellerProfile.findOne({ userId: seller._id });
  if (!sellerProfile) {
    sellerProfile = await SellerProfile.create({
      userId: seller._id,
      storeId: store._id,
      storeName: store.storeName,
      storeCategory: store.category,
      city: store.city,
      state: store.state,
      specialtyRegion: store.region,
      storeDescription: store.description,
      kycStatus: 'verified',
      panNumber: 'ABCDE1234F',
      gstNumber: '07ABCDE1234F1Z5',
      bankAccount: {
        accountNumber: '1234567890',
        ifscCode: 'HDFC0001234',
        accountHolderName: 'Demo Seller',
        bankName: 'HDFC Bank',
        isVerified: true
      },
      pickupAddress: getDefaultPickupAddress(seller._id)
    });
    console.log('✓ Seller profile created');
  } else {
    console.log('↩ Seller profile already exists, skipping');
    if (!hasPickupAddress(sellerProfile)) {
      sellerProfile.pickupAddress = getDefaultPickupAddress(seller._id);
      await sellerProfile.save();
      console.log('✓ Seller pickup address added');
    }
  }

  // ── Products ─────────────────────────────────────────────────────────────────
  const existingCount = await Product.countDocuments({ sellerId: seller._id });
  if (existingCount === 0) {
    const productDocs = products.map((p) => ({
      ...p,
      sellerId: seller._id,
      storeId: store._id,
      status: 'active',
      featured: true
    }));
    await Product.insertMany(productDocs);
    console.log(`✓ ${products.length} products created`);
  } else {
    console.log(`↩ ${existingCount} products already exist, skipping`);
  }

  // ── Buyer ────────────────────────────────────────────────────────────────────
  let buyer = await User.findOne({ email: BUYER_EMAIL });
  if (!buyer) {
    const passwordHash = await bcrypt.hash(BUYER_PASSWORD, 10);
    buyer = await User.create({
      name: 'Demo Buyer',
      email: BUYER_EMAIL,
      passwordHash,
      role: 'buyer',
      phone: '9123456780',
      address: '12 MG Road, Bengaluru, Karnataka 560001'
    });
    console.log('✓ Buyer user created');
  } else {
    console.log('↩ Buyer already exists, skipping');
  }

  console.log('\n─────────────────────────────────────────');
  console.log('DEMO CREDENTIALS — use these in the app');
  console.log('─────────────────────────────────────────');
  console.log(`BUYER   Email: ${BUYER_EMAIL}`);
  console.log(`        Password: ${BUYER_PASSWORD}`);
  console.log(`SELLER  Email: ${SELLER_EMAIL}`);
  console.log(`        Password: ${SELLER_PASSWORD}`);
  console.log('─────────────────────────────────────────\n');

  await mongoose.disconnect();
  console.log('Done.');
}

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
