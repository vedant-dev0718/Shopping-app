const AppError = require('../../utils/AppError');
const ContentPage = require('./contentPage.model');

const lastUpdated = '2026-05-09';

const pages = {
  'privacy-policy': {
    title: 'Privacy Policy',
    lastUpdated,
    sections: [
      {
        heading: 'Information We Collect',
        body: 'NotWhat may collect account details, profile information, store information, product activity, device or usage data, and information submitted during checkout or support requests.'
      },
      {
        heading: 'How We Use Information',
        body: 'We use information to operate the marketplace, show relevant products and reels, support buyer and seller accounts, improve safety, provide analytics, and respond to support requests.'
      },
      {
        heading: 'Media Uploads',
        body: 'Sellers may upload product images, reels, thumbnails, and store media. Uploaded media is used to display listings, storefronts, and seller content inside NotWhat.'
      },
      {
        heading: 'Orders and Shipping',
        body: 'Order and shipping details are used to process purchases, share fulfillment information with sellers, provide order updates, and help resolve support issues.'
      },
      {
        heading: 'Payments',
        body: 'Payment status and method details may be stored for order tracking and support. NotWhat should not store raw card or bank credentials in the app database.'
      },
      {
        heading: 'Analytics',
        body: 'We collect marketplace events such as views, clicks, saves, cart adds, checkout starts, and order activity to power seller dashboards and improve discovery.'
      },
      {
        heading: 'Data Security',
        body: 'We use reasonable technical and organizational safeguards for app data. No system can be guaranteed completely secure, so users should keep account credentials private.'
      },
      {
        heading: 'Contact Us',
        body: 'For privacy questions or account support, contact NotWhat through the in-app support form or the support contact made available by the NotWhat team.'
      }
    ]
  },
  'terms-of-service': {
    title: 'Terms of Service',
    lastUpdated,
    sections: [
      {
        heading: 'Use of NotWhat',
        body: 'NotWhat is a marketplace experience for discovering regional fashion, stores, reels, products, bargains, and orders. Users agree to use the app lawfully and respectfully.'
      },
      {
        heading: 'Buyer Responsibilities',
        body: 'Buyers are responsible for providing accurate account, shipping, and payment information and for reviewing product details before placing orders.'
      },
      {
        heading: 'Seller Responsibilities',
        body: 'Sellers are responsible for accurate storefronts, product listings, pricing, inventory, media, fulfillment, tracking, and customer support for their products.'
      },
      {
        heading: 'Product Listings',
        body: 'Product listings should be accurate, lawful, and not misleading. NotWhat may remove listings that appear unsafe, prohibited, infringing, or inappropriate.'
      },
      {
        heading: 'Orders',
        body: 'Orders are created when a buyer completes checkout. Sellers should process, ship, or cancel orders according to the fulfillment state and applicable policies.'
      },
      {
        heading: 'Payments',
        body: 'Payment methods and statuses are used to confirm order activity. Any production payment provider terms may also apply.'
      },
      {
        heading: 'Prohibited Content',
        body: 'Users may not upload illegal, harmful, hateful, deceptive, infringing, or abusive content, including prohibited products or misleading media.'
      },
      {
        heading: 'Account Termination',
        body: 'NotWhat may suspend or terminate accounts that violate these terms, abuse the platform, create risk, or interfere with marketplace trust and safety.'
      },
      {
        heading: 'Limitation of Liability',
        body: 'NotWhat is provided as an MVP marketplace experience. To the fullest extent allowed by law, liability may be limited for indirect, incidental, or consequential damages.'
      }
    ]
  },
  'return-policy': {
    title: 'Return Policy',
    lastUpdated,
    sections: [
      {
        heading: 'Return Eligibility',
        body: 'Return eligibility may depend on the product type, seller policy, item condition, and time since delivery. Buyers should contact support promptly for return requests.'
      },
      {
        heading: 'Damaged or Incorrect Items',
        body: 'If an item arrives damaged or incorrect, buyers should contact support with the order number, photos, and a description of the issue.'
      },
      {
        heading: 'Seller-Specific Returns',
        body: 'Some sellers may have item-specific return requirements. Seller return terms should be reviewed before purchase when available.'
      },
      {
        heading: 'Refund Timeline',
        body: 'Refund timing may depend on review, seller confirmation, item return, and payment provider processing windows.'
      },
      {
        heading: 'Non-returnable Items',
        body: 'Customized, final-sale, hygiene-sensitive, worn, altered, or damaged-after-delivery items may not be eligible for return.'
      },
      {
        heading: 'Contact Support',
        body: 'Use Contact Support with your order number and issue details to begin a return review.'
      }
    ]
  },
  'shipping-policy': {
    title: 'Shipping Policy',
    lastUpdated,
    sections: [
      {
        heading: 'Shipping Responsibility',
        body: 'Sellers are responsible for preparing and shipping products they sell through NotWhat, including adding tracking details when available.'
      },
      {
        heading: 'Processing Time',
        body: 'Processing times may vary by seller, product availability, region, and order volume. Sellers should update orders as they move through fulfillment.'
      },
      {
        heading: 'Tracking',
        body: 'When an order ships, sellers should provide a tracking number, carrier, and tracking URL when available.'
      },
      {
        heading: 'Delivery Delays',
        body: 'Delivery delays may occur due to carrier issues, weather, address problems, customs, holidays, or events outside a seller or NotWhat control.'
      },
      {
        heading: 'Incorrect Addresses',
        body: 'Buyers are responsible for accurate shipping addresses. Incorrect or incomplete addresses may delay delivery or require support review.'
      },
      {
        heading: 'Contact Support',
        body: 'For shipping questions, contact support with your order number and delivery details.'
      }
    ]
  },
  about: {
    title: 'About NotWhat',
    lastUpdated,
    sections: [
      {
        heading: 'What NotWhat is',
        body: 'NotWhat is a marketplace experience for discovering regional fashion, stores, products, reels, carts, checkout, orders, seller dashboards, analytics, and Bargain Days.'
      },
      {
        heading: 'Mission',
        body: 'NotWhat helps buyers discover expressive regional fashion while giving sellers practical tools to showcase products, tell stories, and manage fulfillment.'
      },
      {
        heading: 'Buyer Experience',
        body: 'Buyers can browse products and stores, watch reels, search, save items, add products to cart, place orders, and track purchases.'
      },
      {
        heading: 'Seller Experience',
        body: 'Sellers can manage storefronts, products, reels, analytics, bargains, and orders from a focused seller dashboard.'
      },
      {
        heading: 'Regional Fashion Focus',
        body: 'NotWhat is designed around regional fashion discovery, with an emphasis on culture, craft, styling, and seller-led product storytelling.'
      }
    ]
  },
  faq: {
    title: 'FAQ',
    lastUpdated,
    sections: [
      {
        heading: 'How do I contact support?',
        body: 'Use the Contact Support screen in the app and include your order number when your question is order-related.'
      },
      {
        heading: 'How do returns work?',
        body: 'Return eligibility depends on the product, seller, and order state. Support can review return requests after delivery.'
      }
    ]
  },
  'contact-support': {
    title: 'Contact Support Information',
    lastUpdated,
    sections: [
      {
        heading: 'Support',
        body: 'Contact NotWhat support through the in-app support form. Include your account email and order number when available.'
      }
    ]
  }
};

const normalizePage = (page) => ({
  slug: page.slug,
  title: page.title,
  lastUpdated: page.lastUpdated instanceof Date ? page.lastUpdated.toISOString().slice(0, 10) : page.lastUpdated,
  sections: page.sections || [],
  isPublished: page.isPublished !== false,
  updatedAt: page.updatedAt,
  updatedBy: page.updatedBy
});

const getContentPage = async (slug) => {
  const storedPage = await ContentPage.findOne({ slug, isPublished: true }).lean();

  if (storedPage) {
    return normalizePage(storedPage);
  }

  const page = pages[slug];

  if (!page) {
    throw new AppError('Content page not found', 404);
  }

  return normalizePage({ slug, isPublished: true, ...page });
};

module.exports = {
  getContentPage,
  fallbackPages: pages
};
