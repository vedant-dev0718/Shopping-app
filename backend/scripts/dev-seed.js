#!/usr/bin/env node
/**
 * Local dev launcher: starts an in-memory MongoDB on 27017, seeds demo data,
 * then starts the Express API on PORT (default 5001).
 *
 * Usage: node scripts/dev-seed.js
 *
 * All data lives in memory and is lost when this process exits — for dev only.
 */

'use strict';

require('dotenv').config();

const { MongoMemoryServer } = require('mongodb-memory-server');

(async () => {
    // ── 1. Start in-memory MongoDB ────────────────────────────────────────────
    console.log('[dev-seed] Starting in-memory MongoDB...');
    const mongod = await MongoMemoryServer.create({
        instance: { port: 27017, dbName: 'notwhat' },
    });
    const uri = mongod.getUri() + 'notwhat';
    process.env.MONGO_URI = uri;
    console.log(`[dev-seed] MongoDB ready at ${uri}\n`);

    // ── 2. Run seed ───────────────────────────────────────────────────────────
    // Inline the seed so it shares the already-started memory server connection.
    const mongoose = require('mongoose');
    await mongoose.connect(uri);

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
            imageUrls: ['https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=600'],
        },
        {
            title: 'Blue Pottery Decorative Plate',
            description: 'Authentic Jaipur blue pottery plate, hand-painted with floral patterns.',
            category: 'Pottery',
            region: 'Rajasthan',
            price: 850,
            stock: 15,
            tags: ['blue pottery', 'jaipur', 'decorative', 'handmade'],
            imageUrls: ['https://images.unsplash.com/photo-1610701596061-2ecf227e85b2?w=600'],
        },
        {
            title: 'Madhubani Art Canvas',
            description: 'Original Madhubani painting on canvas. Traditional folk motifs from Bihar.',
            category: 'Art',
            region: 'Bihar',
            price: 2200,
            stock: 5,
            tags: ['madhubani', 'folk art', 'canvas', 'painting'],
            imageUrls: ['https://images.unsplash.com/photo-1578926375605-eaf7559b1458?w=600'],
        },
        {
            title: 'Kutch Embroidered Tote Bag',
            description: 'Handcrafted cotton tote with intricate Kutch mirror embroidery.',
            category: 'Bags',
            region: 'Gujarat',
            price: 699,
            stock: 20,
            tags: ['kutch', 'embroidery', 'tote', 'bag', 'mirror work'],
            imageUrls: ['https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600'],
        },
        {
            title: 'Channapatna Wooden Toy Set',
            description: 'Traditional lacquered wooden toys from Karnataka artisans.',
            category: 'Toys',
            region: 'Karnataka',
            price: 540,
            stock: 30,
            tags: ['channapatna', 'wooden toys', 'traditional', 'lacquer'],
            imageUrls: ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600'],
        },
    ];

    // Seller
    let seller = await User.findOne({ email: SELLER_EMAIL });
    if (!seller) {
        seller = await User.create({
            name: 'Demo Seller',
            email: SELLER_EMAIL,
            passwordHash: await bcrypt.hash(SELLER_PASSWORD, 10),
            role: 'seller',
            phone: '9876543210',
        });
    }

    // Store
    let store = await Store.findOne({ sellerId: seller._id });
    if (!store) {
        store = await Store.create({
            sellerId: seller._id,
            storeName: 'NotWhat Demo Store',
            category: 'Handicrafts',
            city: 'Delhi',
            state: 'Delhi',
            region: 'North India',
            description: 'Authentic Indian handicrafts sourced directly from artisans.',
            verified: true,
        });
    }

    // Seller profile
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
                isVerified: true,
            },
            pickupAddress: getDefaultPickupAddress(seller._id),
        });
    } else if (!hasPickupAddress(sellerProfile)) {
        sellerProfile.pickupAddress = getDefaultPickupAddress(seller._id);
        await sellerProfile.save();
    }

    // Products
    let seededProducts = await Product.find({ sellerId: seller._id }).lean();
    if (seededProducts.length === 0) {
        seededProducts = await Product.insertMany(
            products.map((p) => ({ ...p, sellerId: seller._id, storeId: store._id, status: 'active', featured: true }))
        );
    }

    // Reels
    if ((await Reel.countDocuments({ sellerId: seller._id })) === 0 && seededProducts.length >= 2) {
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
    }

    // Buyer
    let buyer = await User.findOne({ email: BUYER_EMAIL });
    if (!buyer) {
        buyer = await User.create({
            name: 'Demo Buyer',
            email: BUYER_EMAIL,
            passwordHash: await bcrypt.hash(BUYER_PASSWORD, 10),
            role: 'buyer',
            phone: '9123456780',
            address: '12 MG Road, Bengaluru, Karnataka 560001',
        });
    }

    // Buyer delivery address
    if (!(await Address.findOne({ userId: buyer._id, addressPurpose: 'delivery' }))) {
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
    }

    // Active bargain schedule
    if (seededProducts.length > 0) {
        const bp = seededProducts[0];
        if (!(await BargainSchedule.findOne({ productId: bp._id, status: 'active' }))) {
            const now = new Date();
            await BargainSchedule.create({
                productId: bp._id,
                sellerId: seller._id,
                startDate: now,
                endDate: new Date(now.getTime() + 48 * 60 * 60 * 1000),
                reservePrice: Math.round(bp.price * 0.6),
                status: 'active',
            });
        }
    }

    await mongoose.disconnect();

    console.log('\n─────────────────────────────────────────────');
    console.log('  SEED COMPLETE — demo credentials');
    console.log('─────────────────────────────────────────────');
    console.log(`  BUYER   ${BUYER_EMAIL}  /  ${BUYER_PASSWORD}`);
    console.log(`  SELLER  ${SELLER_EMAIL}  /  ${SELLER_PASSWORD}`);
    console.log('─────────────────────────────────────────────\n');

    // ── 3. Start Express API ──────────────────────────────────────────────────
    console.log('[dev-seed] Starting API server...\n');
    require('../src/server');

    // Keep the memory server alive alongside the API process
    process.on('SIGINT', async () => {
        console.log('\n[dev-seed] Shutting down...');
        await mongod.stop();
        process.exit(0);
    });
})().catch((err) => {
    console.error('[dev-seed] Fatal:', err.message);
    process.exit(1);
});
