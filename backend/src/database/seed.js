const connectDB = require('../config/db');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');

const User = require('../modules/users/user.model');
const BuyerProfile = require('../modules/buyers/buyerProfile.model');
const SellerProfile = require('../modules/sellers/sellerProfile.model');
const Store = require('../modules/stores/store.model');
const Product = require('../modules/products/product.model');
const Reel = require('../modules/reels/reel.model');
const Comment = require('../modules/comments/comment.model');
const Like = require('../modules/likes/like.model');
const Cart = require('../modules/cart/cart.model');
const Order = require('../modules/orders/order.model');
const Bid = require('../modules/bargain/bid.model');
const BargainSchedule = require('../modules/bargain/bargainSchedule.model');
const AnalyticsEvent = require('../modules/analytics/analyticsEvent.model');
const { getDefaultPickupAddress } = require('../utils/pickupAddressDefaults');

const demoEmails = [
  'buyer@example.com',
  'seller@example.com',
  'seller2@example.com',
  'seller3@example.com'
];

const demoStoreNames = [
  'Jaipur Heritage House',
  'Mumbai Street Market',
  'Chennai Bridal Atelier',
  'Demo Heritage Store'
];

const createSellerStore = async ({ user, store }) => {
  const seller = await User.create(user);
  const createdStore = await Store.create({
    sellerId: seller._id,
    storeName: store.storeName,
    category: store.category,
    city: store.city,
    state: store.state,
    region: store.region,
    description: store.description,
    story: store.story || '',
    profileImageUrl: store.profileImageUrl || '',
    bannerImageUrl: store.bannerImageUrl || '',
    verified: store.verified || false,
    featuredCategories: store.featuredCategories || [],
    viewCount: 0,
    savedBy: []
  });

  await SellerProfile.create({
    userId: seller._id,
    storeId: createdStore._id,
    storeName: createdStore.storeName,
    storeCategory: createdStore.category,
    city: createdStore.city,
    state: createdStore.state,
    specialtyRegion: createdStore.region,
    storeDescription: createdStore.description,
    pickupAddress: getDefaultPickupAddress(seller._id)
  });

  return {
    seller,
    store: createdStore
  };
};

const seed = async () => {
  await connectDB();
  const passwordHash = await bcrypt.hash('Password123!', 12);
  const demoUsers = await User.find({ email: { $in: demoEmails } });
  const demoUserIds = demoUsers.map((user) => user._id);
  const demoStores = await Store.find({
    $or: [
      { sellerId: { $in: demoUserIds } },
      { storeName: { $in: demoStoreNames } }
    ]
  });
  const demoStoreIds = demoStores.map((store) => store._id);
  const demoProducts = await Product.find({
    $or: [
      { sellerId: { $in: demoUserIds } },
      { storeId: { $in: demoStoreIds } }
    ]
  });
  const demoProductIds = demoProducts.map((product) => product._id);
  const demoReels = await Reel.find({
    $or: [
      { sellerId: { $in: demoUserIds } },
      { storeId: { $in: demoStoreIds } }
    ]
  });
  const demoReelIds = demoReels.map((reel) => reel._id);

  await Like.deleteMany({ reelId: { $in: demoReelIds } });
  await Comment.deleteMany({ reelId: { $in: demoReelIds } });
  await Reel.deleteMany({ _id: { $in: demoReelIds } });
  await Cart.deleteMany({ buyerId: { $in: demoUserIds } });
  await Order.deleteMany({ buyerId: { $in: demoUserIds } });
  await AnalyticsEvent.deleteMany({
    $or: [
      { userId: { $in: demoUserIds } },
      { sellerId: { $in: demoUserIds } },
      { storeId: { $in: demoStoreIds } },
      { productId: { $in: demoProductIds } },
      { reelId: { $in: demoReelIds } }
    ]
  });
  await Bid.deleteMany({
    $or: [
      { sellerId: { $in: demoUserIds } },
      { buyerId: { $in: demoUserIds } },
      { productId: { $in: demoProductIds } }
    ]
  });
  await BargainSchedule.deleteMany({
    $or: [
      { sellerId: { $in: demoUserIds } },
      { productId: { $in: demoProductIds } }
    ]
  });
  await Product.deleteMany({
    $or: [
      { sellerId: { $in: demoUserIds } },
      { storeId: { $in: demoStoreIds } }
    ]
  });
  await BuyerProfile.deleteMany({ userId: { $in: demoUserIds } });
  await SellerProfile.deleteMany({ userId: { $in: demoUserIds } });
  await Store.deleteMany({ _id: { $in: demoStoreIds } });
  await User.deleteMany({ _id: { $in: demoUserIds } });

  const buyer = await User.create({
    name: 'Demo Buyer',
    email: 'buyer@example.com',
    passwordHash,
    phone: '555-0101',
    role: 'buyer',
    address: '123 Demo Street'
  });

  await BuyerProfile.create({
    userId: buyer._id,
    savedProducts: [],
    savedStores: [],
    watchedReels: [],
    preferredRegions: ['South Asia'],
    preferredCategories: ['Clothing']
  });

  const jaipur = await createSellerStore({
    user: {
      name: 'Demo Seller',
      email: 'seller@example.com',
      passwordHash,
      phone: '555-0102',
      role: 'seller'
    },
    store: {
      storeName: 'Jaipur Heritage House',
      category: 'Regional Wear',
      city: 'Jaipur',
      state: 'Rajasthan',
      region: 'North India',
      description: 'Handpicked sarees, suits, and regional wear from Rajasthan.',
      story: 'Family-led textile sourcing rooted in Jaipur craft markets.',
      verified: true,
      featuredCategories: ['Sarees', 'Suits', 'Regional Wear']
    }
  });

  const mumbai = await createSellerStore({
    user: {
      name: 'Demo Seller Two',
      email: 'seller2@example.com',
      passwordHash,
      phone: '555-0103',
      role: 'seller'
    },
    store: {
      storeName: 'Mumbai Street Market',
      category: 'Streetwear',
      city: 'Mumbai',
      state: 'Maharashtra',
      region: 'West India',
      description: 'Modern streetwear, accessories, and footwear from Mumbai.',
      story: 'A street-style catalog inspired by Colaba and Bandra finds.',
      verified: true,
      featuredCategories: ['Streetwear', 'Footwear', 'Accessories']
    }
  });

  const chennai = await createSellerStore({
    user: {
      name: 'Demo Seller Three',
      email: 'seller3@example.com',
      passwordHash,
      phone: '555-0104',
      role: 'seller'
    },
    store: {
      storeName: 'Chennai Bridal Atelier',
      category: 'Bridal',
      city: 'Chennai',
      state: 'Tamil Nadu',
      region: 'South India',
      description: 'Bridal, jewelry, sarees, and ceremonial accessories.',
      story: 'Occasion-focused pieces from South Indian wedding traditions.',
      verified: false,
      featuredCategories: ['Bridal', 'Jewelry', 'Sarees']
    }
  });

  const products = [
    {
      sellerId: jaipur.seller._id,
      storeId: jaipur.store._id,
      title: 'Banarasi Silk Saree',
      description: 'Rich woven silk saree with gold-toned border details.',
      productLink: 'https://example.com/products/banarasi-silk-saree',
      category: 'Sarees',
      region: 'North India',
      price: 189.99,
      stock: 8,
      tags: ['silk', 'festive', 'banarasi'],
      imageUrls: ['https://example.com/images/banarasi-silk-saree.jpg'],
      featured: true
    },
    {
      sellerId: jaipur.seller._id,
      storeId: jaipur.store._id,
      title: 'Rajasthani Bandhani Saree',
      description: 'Bright bandhani saree made for festive gatherings.',
      productLink: 'https://example.com/products/rajasthani-bandhani-saree',
      category: 'Sarees',
      region: 'North India',
      price: 119.99,
      stock: 12,
      tags: ['bandhani', 'rajasthan', 'colorful'],
      imageUrls: ['https://example.com/images/rajasthani-bandhani-saree.jpg'],
      featured: true
    },
    {
      sellerId: jaipur.seller._id,
      storeId: jaipur.store._id,
      title: 'Phulkari Suit Set',
      description: 'Cotton suit set with embroidered dupatta.',
      productLink: 'https://example.com/products/phulkari-suit-set',
      category: 'Suits',
      region: 'North India',
      price: 94.5,
      stock: 10,
      tags: ['phulkari', 'cotton', 'embroidered'],
      imageUrls: ['https://example.com/images/phulkari-suit-set.jpg'],
      featured: false
    },
    {
      sellerId: jaipur.seller._id,
      storeId: jaipur.store._id,
      title: 'Kutch Embroidered Jacket',
      description: 'Mirror-work regional jacket for layered styling.',
      productLink: 'https://example.com/products/kutch-embroidered-jacket',
      category: 'Regional Wear',
      region: 'West India',
      price: 78,
      stock: 0,
      tags: ['kutch', 'mirror-work', 'jacket'],
      imageUrls: ['https://example.com/images/kutch-embroidered-jacket.jpg'],
      featured: false
    },
    {
      sellerId: jaipur.seller._id,
      storeId: jaipur.store._id,
      title: 'Jaipur Lac Bangles',
      description: 'Set of colorful handmade lac bangles.',
      productLink: 'https://example.com/products/jaipur-lac-bangles',
      category: 'Jewelry',
      region: 'North India',
      price: 32,
      stock: 30,
      tags: ['lac', 'bangles', 'handmade'],
      imageUrls: ['https://example.com/images/jaipur-lac-bangles.jpg'],
      featured: false
    },
    {
      sellerId: mumbai.seller._id,
      storeId: mumbai.store._id,
      title: 'Mumbai Graphic Kurta Tee',
      description: 'Streetwear tee with kurta-inspired side vents.',
      productLink: 'https://example.com/products/mumbai-graphic-kurta-tee',
      category: 'Streetwear',
      region: 'West India',
      price: 46,
      stock: 22,
      tags: ['streetwear', 'graphic', 'mumbai'],
      imageUrls: ['https://example.com/images/mumbai-graphic-kurta-tee.jpg'],
      featured: true
    },
    {
      sellerId: mumbai.seller._id,
      storeId: mumbai.store._id,
      title: 'Bandra Oversized Jacket',
      description: 'Relaxed jacket with block-print lining.',
      productLink: 'https://example.com/products/bandra-oversized-jacket',
      category: 'Streetwear',
      region: 'West India',
      price: 88,
      stock: 14,
      tags: ['bandra', 'jacket', 'oversized'],
      imageUrls: ['https://example.com/images/bandra-oversized-jacket.jpg'],
      featured: true
    },
    {
      sellerId: mumbai.seller._id,
      storeId: mumbai.store._id,
      title: 'Kolhapuri Leather Sandals',
      description: 'Classic handmade sandals with stitched leather straps.',
      productLink: 'https://example.com/products/kolhapuri-leather-sandals',
      category: 'Footwear',
      region: 'West India',
      price: 52,
      stock: 18,
      tags: ['kolhapuri', 'leather', 'sandals'],
      imageUrls: ['https://example.com/images/kolhapuri-leather-sandals.jpg'],
      featured: false
    },
    {
      sellerId: mumbai.seller._id,
      storeId: mumbai.store._id,
      title: 'Block Print Tote',
      description: 'Everyday tote with printed cotton panels.',
      productLink: 'https://example.com/products/block-print-tote',
      category: 'Accessories',
      region: 'West India',
      price: 28,
      stock: 40,
      tags: ['tote', 'block-print', 'cotton'],
      imageUrls: ['https://example.com/images/block-print-tote.jpg'],
      featured: false
    },
    {
      sellerId: mumbai.seller._id,
      storeId: mumbai.store._id,
      title: 'Silver Oxidized Hoops',
      description: 'Lightweight oxidized hoops for daily styling.',
      productLink: 'https://example.com/products/silver-oxidized-hoops',
      category: 'Jewelry',
      region: 'West India',
      price: 24,
      stock: 35,
      tags: ['oxidized', 'hoops', 'silver-tone'],
      imageUrls: ['https://example.com/images/silver-oxidized-hoops.jpg'],
      featured: false
    },
    {
      sellerId: chennai.seller._id,
      storeId: chennai.store._id,
      title: 'Kanjivaram Bridal Saree',
      description: 'Ceremonial silk saree with traditional temple border.',
      productLink: 'https://example.com/products/kanjivaram-bridal-saree',
      category: 'Bridal',
      region: 'South India',
      price: 349,
      stock: 5,
      tags: ['kanjivaram', 'bridal', 'silk'],
      imageUrls: ['https://example.com/images/kanjivaram-bridal-saree.jpg'],
      featured: true
    },
    {
      sellerId: chennai.seller._id,
      storeId: chennai.store._id,
      title: 'Temple Jewelry Necklace Set',
      description: 'Statement necklace set inspired by temple jewelry.',
      productLink: 'https://example.com/products/temple-jewelry-necklace-set',
      category: 'Jewelry',
      region: 'South India',
      price: 135,
      stock: 11,
      tags: ['temple', 'necklace', 'wedding'],
      imageUrls: ['https://example.com/images/temple-jewelry-necklace-set.jpg'],
      featured: true
    },
    {
      sellerId: chennai.seller._id,
      storeId: chennai.store._id,
      title: 'Madurai Cotton Saree',
      description: 'Soft cotton saree for warm-weather daily wear.',
      productLink: 'https://example.com/products/madurai-cotton-saree',
      category: 'Sarees',
      region: 'South India',
      price: 72,
      stock: 16,
      tags: ['madurai', 'cotton', 'daily-wear'],
      imageUrls: ['https://example.com/images/madurai-cotton-saree.jpg'],
      featured: false
    },
    {
      sellerId: chennai.seller._id,
      storeId: chennai.store._id,
      title: 'Kerala Kasavu Dupatta',
      description: 'Cream and gold kasavu dupatta for festive outfits.',
      productLink: 'https://example.com/products/kerala-kasavu-dupatta',
      category: 'Accessories',
      region: 'South India',
      price: 44,
      stock: 20,
      tags: ['kasavu', 'dupatta', 'festive'],
      imageUrls: ['https://example.com/images/kerala-kasavu-dupatta.jpg'],
      featured: false
    },
    {
      sellerId: chennai.seller._id,
      storeId: chennai.store._id,
      title: 'Mysore Silk Suit',
      description: 'Polished silk suit set with understated sheen.',
      productLink: 'https://example.com/products/mysore-silk-suit',
      category: 'Suits',
      region: 'South India',
      price: 128,
      stock: 7,
      tags: ['mysore', 'silk', 'suit'],
      imageUrls: ['https://example.com/images/mysore-silk-suit.jpg'],
      featured: false
    }
  ];

  const createdProducts = await Product.create(products.map((product) => ({
    ...product,
    status: product.stock === 0 ? 'sold_out' : 'active',
    saveCount: 0,
    clickCount: 0
  })));
  const productByTitle = new Map(createdProducts.map((product) => [product.title, product]));
  const productIds = (...titles) => titles.map((title) => productByTitle.get(title)._id);
  const orderItemFor = (title, quantity) => {
    const product = productByTitle.get(title);
    const itemTotal = Math.round(product.price * quantity * 100) / 100;

    return {
      productId: product._id,
      sellerId: product.sellerId,
      storeId: product.storeId,
      titleSnapshot: product.title,
      imageSnapshot: product.imageUrls[0] || '',
      priceSnapshot: product.price,
      quantity,
      itemTotal
    };
  };
  const demoShippingInfo = {
    name: 'Demo Buyer',
    email: 'buyer@example.com',
    phone: '555-0101',
    address: '123 Demo Street',
    city: 'New York',
    state: 'NY',
    postalCode: '10001'
  };
  const demoOrders = [
    {
      orderNumber: 'NW-DEMO-1001',
      items: [orderItemFor('Banarasi Silk Saree', 1)],
      paymentStatus: 'paid',
      orderStatus: 'placed',
      trackingStatus: 'Order Confirmed',
      shipping: 0
    },
    {
      orderNumber: 'NW-DEMO-1002',
      items: [orderItemFor('Phulkari Suit Set', 2)],
      paymentStatus: 'paid',
      orderStatus: 'processing',
      trackingStatus: 'Processing',
      shipping: 4.99
    },
    {
      orderNumber: 'NW-DEMO-1003',
      items: [
        orderItemFor('Jaipur Lac Bangles', 1),
        orderItemFor('Block Print Tote', 1)
      ],
      paymentStatus: 'pending',
      orderStatus: 'confirmed',
      trackingStatus: 'Order Confirmed',
      shipping: 4.99
    }
  ];

  await Order.create(demoOrders.map((order) => {
    const subtotal = order.items.reduce((total, item) => total + item.itemTotal, 0);
    const sellerIds = [...new Set(order.items.map((item) => item.sellerId.toString()))];

    return {
      buyerId: buyer._id,
      sellerIds,
      orderNumber: order.orderNumber,
      items: order.items,
      shippingInfo: demoShippingInfo,
      paymentMethod: 'UPI',
      paymentStatus: order.paymentStatus,
      orderStatus: order.orderStatus,
      trackingStatus: order.trackingStatus,
      subtotal,
      shipping: order.shipping,
      finalTotal: Math.round((subtotal + order.shipping) * 100) / 100,
      emailSent: false
    };
  }));
  const bargainProduct = productByTitle.get('Banarasi Silk Saree');
  const activeBargain = await BargainSchedule.create({
    sellerId: jaipur.seller._id,
    productId: bargainProduct._id,
    startDate: new Date(Date.now() - (60 * 60 * 1000)),
    endDate: new Date(Date.now() + (24 * 60 * 60 * 1000)),
    status: 'active'
  });

  await Bid.create({
    sellerId: jaipur.seller._id,
    buyerId: buyer._id,
    productId: bargainProduct._id,
    amount: 155,
    paymentStatus: 'authorized',
    bidStatus: 'active'
  });

  await Reel.create([
    {
      sellerId: jaipur.seller._id,
      storeId: jaipur.store._id,
      videoUrl: 'https://example.com/videos/jaipur-saree-drape.mp4',
      thumbnailUrl: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800',
      caption: 'Three ways to style a festive Banarasi drape.',
      hashtags: ['sarees', 'banarasi', 'festivewear'],
      region: 'North India',
      category: 'Sarees',
      taggedProductIds: productIds('Banarasi Silk Saree', 'Jaipur Lac Bangles'),
      mutedByDefault: true,
      status: 'active'
    },
    {
      sellerId: jaipur.seller._id,
      storeId: jaipur.store._id,
      videoUrl: 'https://example.com/videos/bandhani-color-story.mp4',
      thumbnailUrl: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800',
      caption: 'Bandhani color pairing for a weekend celebration.',
      hashtags: ['bandhani', 'rajasthan', 'colorstory'],
      region: 'North India',
      category: 'Sarees',
      taggedProductIds: productIds('Rajasthani Bandhani Saree'),
      mutedByDefault: true,
      status: 'active'
    },
    {
      sellerId: jaipur.seller._id,
      storeId: jaipur.store._id,
      videoUrl: 'https://example.com/videos/phulkari-suit-edit.mp4',
      thumbnailUrl: 'https://images.unsplash.com/photo-1614093302611-8efc4de12407?w=800',
      caption: 'A soft Phulkari suit with handmade jewelry accents.',
      hashtags: ['suits', 'phulkari', 'northindia'],
      region: 'North India',
      category: 'Suits',
      taggedProductIds: productIds('Phulkari Suit Set', 'Jaipur Lac Bangles'),
      mutedByDefault: true,
      status: 'active'
    },
    {
      sellerId: mumbai.seller._id,
      storeId: mumbai.store._id,
      videoUrl: 'https://example.com/videos/mumbai-streetwear-layering.mp4',
      thumbnailUrl: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800',
      caption: 'Streetwear layering with a kurta tee and oversized jacket.',
      hashtags: ['streetwear', 'mumbai', 'layering'],
      region: 'West India',
      category: 'Streetwear',
      taggedProductIds: productIds('Mumbai Graphic Kurta Tee', 'Bandra Oversized Jacket'),
      mutedByDefault: true,
      status: 'active'
    },
    {
      sellerId: mumbai.seller._id,
      storeId: mumbai.store._id,
      videoUrl: 'https://example.com/videos/kolhapuri-closeup.mp4',
      thumbnailUrl: 'https://images.unsplash.com/photo-1520639888713-7851133b1ed0?w=800',
      caption: 'Handmade Kolhapuri sandals from every angle.',
      hashtags: ['footwear', 'kolhapuri', 'handmade'],
      region: 'West India',
      category: 'Footwear',
      taggedProductIds: productIds('Kolhapuri Leather Sandals'),
      mutedByDefault: true,
      status: 'active'
    },
    {
      sellerId: mumbai.seller._id,
      storeId: mumbai.store._id,
      videoUrl: 'https://example.com/videos/accessory-flatlay.mp4',
      thumbnailUrl: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800',
      caption: 'Tote and hoops for an easy market-day fit.',
      hashtags: ['accessories', 'jewelry', 'flatlay'],
      region: 'West India',
      category: 'Accessories',
      taggedProductIds: productIds('Block Print Tote', 'Silver Oxidized Hoops'),
      mutedByDefault: true,
      status: 'active'
    },
    {
      sellerId: chennai.seller._id,
      storeId: chennai.store._id,
      videoUrl: 'https://example.com/videos/kanjivaram-bridal-look.mp4',
      thumbnailUrl: 'https://images.unsplash.com/photo-1596993100471-c3905dafa78e?w=800',
      caption: 'Kanjivaram bridal styling with temple jewelry.',
      hashtags: ['bridal', 'kanjivaram', 'wedding'],
      region: 'South India',
      category: 'Bridal',
      taggedProductIds: productIds('Kanjivaram Bridal Saree', 'Temple Jewelry Necklace Set'),
      mutedByDefault: true,
      status: 'active'
    },
    {
      sellerId: chennai.seller._id,
      storeId: chennai.store._id,
      videoUrl: 'https://example.com/videos/madurai-cotton-daywear.mp4',
      thumbnailUrl: 'https://images.unsplash.com/photo-1602573991155-21f0143bb45c?w=800',
      caption: 'Madurai cotton saree for light, everyday styling.',
      hashtags: ['sarees', 'madurai', 'daywear'],
      region: 'South India',
      category: 'Sarees',
      taggedProductIds: productIds('Madurai Cotton Saree'),
      mutedByDefault: true,
      status: 'active'
    },
    {
      sellerId: chennai.seller._id,
      storeId: chennai.store._id,
      videoUrl: 'https://example.com/videos/kasavu-festive-detail.mp4',
      thumbnailUrl: 'https://images.unsplash.com/photo-1591130901921-3f0652bb3c0c?w=800',
      caption: 'Kasavu gold details for festive layering.',
      hashtags: ['kasavu', 'accessories', 'southindia'],
      region: 'South India',
      category: 'Accessories',
      taggedProductIds: productIds('Kerala Kasavu Dupatta', 'Mysore Silk Suit'),
      mutedByDefault: true,
      status: 'active'
    },
    {
      sellerId: jaipur.seller._id,
      storeId: jaipur.store._id,
      videoUrl: 'https://example.com/videos/regional-layering-mix.mp4',
      thumbnailUrl: 'https://images.unsplash.com/photo-1595777216528-071e0127ccbf?w=800',
      caption: 'Regional layering with one sold-out piece and one shoppable accessory.',
      hashtags: ['regionalwear', 'layering', 'jaipur'],
      region: 'North India',
      category: 'Regional Wear',
      taggedProductIds: productIds('Kutch Embroidered Jacket', 'Jaipur Lac Bangles'),
      mutedByDefault: true,
      status: 'active'
    }
  ]);

  console.log('Seeded demo users, 3 stores, 15 products, 10 reels, 3 orders, and 1 active bargain.');
  console.log('Demo buyer: buyer@example.com / Password123!');
  console.log('Demo seller: seller@example.com / Password123!');
  await mongoose.connection.close();
  process.exit(0);
};

seed().catch((error) => {
  console.error('Seed script failed:', error.message);
  process.exit(1);
});
