// Run: node scripts/seed-demo.js
// Seeds one demo seller, one demo buyer, a store, 5 products, 2 reels,
// a buyer delivery address, and an active bargain schedule.
// Prints credentials to use in the app.

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const env = require('../src/config/env');
const User = require('../src/modules/users/user.model');
const Store = require('../src/modules/stores/store.model');
const SellerProfile = require('../src/modules/sellers/sellerProfile.model');
const Product = require('../src/modules/products/product.model');
const Reel = require('../src/modules/reels/reel.model');
const Address = require('../src/modules/addresses/address.model');
const BargainSchedule = require('../src/modules/bargain/bargainSchedule.model');
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
  let seededProducts = [];
  if (existingCount === 0) {
    const productDocs = products.map((p) => ({
      ...p,
      sellerId: seller._id,
      storeId: store._id,
      status: 'active',
      featured: true
    }));
    seededProducts = await Product.insertMany(productDocs);
    console.log(`✓ ${products.length} products created`);
  } else {
    seededProducts = await Product.find({ sellerId: seller._id }).lean();
    console.log(`↩ ${existingCount} products already exist, skipping`);
  }

  // ── Reels ─────────────────────────────────────────────────────────────────────
  const existingReelCount = await Reel.countDocuments({ sellerId: seller._id });
  if (existingReelCount === 0 && seededProducts.length >= 2) {
    await Reel.insertMany([
      {
        sellerId: seller._id,
        storeId: store._id,
        videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        thumbnailUrl: 'https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=600',
        caption: 'New block-print collection just dropped 🎨 #IndianFashion',
        region: 'Uttar Pradesh',
        category: 'Textiles',
        hashtags: ['indianfashion', 'handwoven', 'silk'],
        taggedProductIds: [seededProducts[0]._id],
        status: 'active',
        viewCount: 1240,
        likeCount: 340,
        commentCount: 12,
      },
      {
        sellerId: seller._id,
        storeId: store._id,
        videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
        thumbnailUrl: 'https://images.unsplash.com/photo-1610701596061-2ecf227e85b2?w=600',
        caption: 'Handpainted Jaipur blue pottery — every piece is unique 🏺',
        region: 'Rajasthan',
        category: 'Pottery',
        hashtags: ['bluepottery', 'jaipur', 'handmade'],
        taggedProductIds: [seededProducts[1]._id],
        status: 'active',
        viewCount: 3870,
        likeCount: 820,
        commentCount: 47,
      },
    ]);
    console.log('✓ 2 reels created');
  } else {
    console.log(`↩ ${existingReelCount} reels already exist, skipping`);
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

  // ── Buyer delivery address ────────────────────────────────────────────────────
  const existingAddress = await Address.findOne({ userId: buyer._id, addressPurpose: 'delivery' });
  if (!existingAddress) {
    await Address.create({
      userId: buyer._id,
      addressOwnerType: 'buyer',
      addressPurpose: 'delivery',
      addressType: 'home',
      contactName: 'Demo Buyer',
      contactPhone: '9123456780',
      addressLine1: '12 MG Road',
      addressLine2: 'Indiranagar',
      city: 'Bengaluru',
      state: 'Karnataka',
      postalCode: '560038',
      country: 'India',
      isDefault: true,
    });
    console.log('✓ Buyer delivery address created');
  } else {
    console.log('↩ Buyer address already exists, skipping');
  }

  // ── Bargain schedule ──────────────────────────────────────────────────────────
  if (seededProducts.length > 0) {
    const bargainProduct = seededProducts[0];
    const existingBargain = await BargainSchedule.findOne({
      productId: bargainProduct._id,
      status: 'active',
    });
    if (!existingBargain) {
      const now = new Date();
      await BargainSchedule.create({
        productId: bargainProduct._id,
        sellerId: seller._id,
        startDate: now,
        endDate: new Date(now.getTime() + 48 * 60 * 60 * 1000), // 48 h window
        reservePrice: Math.round(bargainProduct.price * 0.6),
        status: 'active',
      });
      console.log('✓ Active bargain schedule created');
    } else {
      console.log('↩ Active bargain already exists, skipping');
    }
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
