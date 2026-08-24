// Run: node scripts/seed-demo.js
// Seeds two demo sellers (each with their own store, products, reels and UPI ID),
// one demo buyer, a buyer delivery address, and an active bargain schedule.
// The two distinct UPI IDs are what produce two different store QR codes at checkout.
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

const SELLER_PASSWORD = 'Test@1234';
const BUYER_EMAIL = 'buyer@notwhat.test';
const BUYER_PASSWORD = 'Test@1234';

const SELLERS = [
  {
    name: 'Demo Seller One',
    email: 'seller@notwhat.test',
    phone: '9876543210',
    upiId: 'demoseller1@okhdfcbank',
    panNumber: 'ABCDE1234F',
    gstNumber: '07ABCDE1234F1Z5',
    bankAccount: {
      accountNumber: '1234567890',
      ifscCode: 'HDFC0001234',
      accountHolderName: 'Demo Seller One',
      bankName: 'HDFC Bank',
      isVerified: true
    },
    store: {
      storeName: 'NotWhat Demo Store',
      category: 'Handicrafts',
      city: 'Delhi',
      state: 'Delhi',
      region: 'North India',
      description: 'A curated collection of authentic Indian handicrafts sourced directly from artisans.'
    },
    products: [
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
      }
    ],
    reels: [
      {
        videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        thumbnailUrl: 'https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=600',
        caption: 'New block-print collection just dropped 🎨 #IndianFashion',
        region: 'Uttar Pradesh',
        category: 'Textiles',
        hashtags: ['indianfashion', 'handwoven', 'silk'],
        viewCount: 1240,
        likeCount: 340,
        commentCount: 12
      },
      {
        videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
        thumbnailUrl: 'https://images.unsplash.com/photo-1610701596061-2ecf227e85b2?w=600',
        caption: 'Handpainted Jaipur blue pottery — every piece is unique 🏺',
        region: 'Rajasthan',
        category: 'Pottery',
        hashtags: ['bluepottery', 'jaipur', 'handmade'],
        viewCount: 3870,
        likeCount: 820,
        commentCount: 47
      }
    ]
  },
  {
    name: 'Demo Seller Two',
    email: 'seller2@notwhat.test',
    phone: '9876543211',
    upiId: 'demoseller2@oksbi',
    panNumber: 'FGHIJ5678K',
    gstNumber: '24FGHIJ5678K1Z9',
    bankAccount: {
      accountNumber: '9876543210',
      ifscCode: 'SBIN0005678',
      accountHolderName: 'Demo Seller Two',
      bankName: 'State Bank of India',
      isVerified: true
    },
    store: {
      storeName: 'Craft Bazaar Collective',
      category: 'Handicrafts',
      city: 'Ahmedabad',
      state: 'Gujarat',
      region: 'West India',
      description: 'Artisan-run collective bringing Kutch embroidery and Channapatna woodcraft to your doorstep.'
    },
    products: [
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
    ],
    reels: [
      {
        videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        thumbnailUrl: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600',
        caption: 'Mirror-work totes straight from the Kutch workshop ✨',
        region: 'Gujarat',
        category: 'Bags',
        hashtags: ['kutch', 'embroidery', 'handmade'],
        viewCount: 2110,
        likeCount: 512,
        commentCount: 23
      },
      {
        videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
        thumbnailUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600',
        caption: 'Non-toxic lacquer toys, turned entirely by hand 🪀',
        region: 'Karnataka',
        category: 'Toys',
        hashtags: ['channapatna', 'woodentoys', 'ecofriendly'],
        viewCount: 1580,
        likeCount: 402,
        commentCount: 18
      }
    ]
  }
];

async function seed() {
  await mongoose.connect(env.mongoUri);
  console.log('Connected to MongoDB\n');

  const seededSellers = [];

  for (const definition of SELLERS) {
    // ── Seller ────────────────────────────────────────────────────────────────
    let seller = await User.findOne({ email: definition.email });
    if (!seller) {
      const passwordHash = await bcrypt.hash(SELLER_PASSWORD, 10);
      seller = await User.create({
        name: definition.name,
        email: definition.email,
        passwordHash,
        role: 'seller',
        phone: definition.phone
      });
      console.log(`✓ Seller user created (${definition.email})`);
    } else {
      console.log(`↩ Seller already exists, skipping (${definition.email})`);
    }

    // ── Store ─────────────────────────────────────────────────────────────────
    let store = await Store.findOne({ sellerId: seller._id });
    if (!store) {
      store = await Store.create({
        sellerId: seller._id,
        ...definition.store,
        verified: true
      });
      console.log(`✓ Store created (${store.storeName})`);
    } else {
      console.log(`↩ Store already exists, skipping (${store.storeName})`);
    }

    // ── Seller Profile ────────────────────────────────────────────────────────
    // upiId drives the per-store checkout QR code, so it must differ per seller.
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
        upiId: definition.upiId,
        panNumber: definition.panNumber,
        gstNumber: definition.gstNumber,
        bankAccount: definition.bankAccount,
        pickupAddress: getDefaultPickupAddress(seller._id)
      });
      console.log(`✓ Seller profile created (UPI ${definition.upiId})`);
    } else {
      console.log(`↩ Seller profile already exists (${definition.email})`);
      if (sellerProfile.upiId !== definition.upiId) {
        sellerProfile.upiId = definition.upiId;
        await sellerProfile.save();
        console.log(`✓ Seller UPI ID set to ${definition.upiId}`);
      }
      if (!hasPickupAddress(sellerProfile)) {
        sellerProfile.pickupAddress = getDefaultPickupAddress(seller._id);
        await sellerProfile.save();
        console.log('✓ Seller pickup address added');
      }
    }

    // ── Products ──────────────────────────────────────────────────────────────
    const existingCount = await Product.countDocuments({ sellerId: seller._id });
    let sellerProducts = [];
    if (existingCount === 0) {
      sellerProducts = await Product.insertMany(definition.products.map((p) => ({
        ...p,
        sellerId: seller._id,
        storeId: store._id,
        status: 'active',
        featured: true
      })));
      console.log(`✓ ${sellerProducts.length} products created (${store.storeName})`);
    } else {
      sellerProducts = await Product.find({ sellerId: seller._id }).lean();
      console.log(`↩ ${existingCount} products already exist, skipping (${store.storeName})`);
    }

    // ── Reels ─────────────────────────────────────────────────────────────────
    const existingReelCount = await Reel.countDocuments({ sellerId: seller._id });
    if (existingReelCount === 0 && sellerProducts.length >= 2) {
      await Reel.insertMany(definition.reels.map((reel, index) => ({
        ...reel,
        sellerId: seller._id,
        storeId: store._id,
        taggedProductIds: [sellerProducts[index]._id],
        status: 'active'
      })));
      console.log(`✓ ${definition.reels.length} reels created (${store.storeName})`);
    } else {
      console.log(`↩ ${existingReelCount} reels already exist, skipping (${store.storeName})`);
    }

    seededSellers.push({ definition, seller, store, products: sellerProducts });
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
  const primarySeller = seededSellers[0];
  if (primarySeller && primarySeller.products.length > 0) {
    const bargainProduct = primarySeller.products[0];
    const existingBargain = await BargainSchedule.findOne({
      productId: bargainProduct._id,
      status: 'active',
    });
    if (!existingBargain) {
      const now = new Date();
      await BargainSchedule.create({
        productId: bargainProduct._id,
        sellerId: primarySeller.seller._id,
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
  seededSellers.forEach(({ definition, store }, index) => {
    console.log(`SELLER ${index + 1} Email: ${definition.email}`);
    console.log(`        Password: ${SELLER_PASSWORD}`);
    console.log(`        Store: ${store.storeName}`);
    console.log(`        UPI (QR): ${definition.upiId}`);
  });
  console.log('─────────────────────────────────────────');
  console.log('Add one product from EACH store to the buyer cart to see two distinct QR codes.');
  console.log('─────────────────────────────────────────\n');

  await mongoose.disconnect();
  console.log('Done.');
}

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
