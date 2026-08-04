const base = process.env.NOTWHAT_API_BASE_URL || 'http://127.0.0.1:5001/api';
const sellerEmail = process.env.NOTWHAT_SELLER_EMAIL || 'seller@example.com';
const buyerEmail = process.env.NOTWHAT_BUYER_EMAIL || 'buyer@example.com';
const password = process.env.NOTWHAT_TEST_PASSWORD || 'Password123!';

async function request(path, { method = 'GET', token, body } = {}) {
    const response = await fetch(`${base}${path}`, {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
    });

    const payload = await response.json();

    if (!response.ok || payload.success === false) {
        throw new Error(`${method} ${path} failed: ${response.status} ${payload.message || 'unknown error'}`);
    }

    return payload.data;
}

async function main() {
    const sellerAuth = await request('/auth/login', {
        method: 'POST',
        body: { email: sellerEmail, password },
    });
    const buyerAuth = await request('/auth/login', {
        method: 'POST',
        body: { email: buyerEmail, password },
    });

    const sellerToken = sellerAuth.token;
    const buyerToken = buyerAuth.token;

    const sellerProducts = await request('/seller/products', { token: sellerToken });
    const existingProduct = sellerProducts[0];
    if (!existingProduct?._id) {
        throw new Error('No seller product available for tagging smoke test');
    }

    const createdProduct = await request('/seller/products', {
        method: 'POST',
        token: sellerToken,
        body: {
            title: `Contract Smoke Product ${Date.now()}`,
            description: 'Smoke test product for frontend contract validation.',
            category: existingProduct.category,
            region: existingProduct.region,
            price: 77.5,
            stock: 9,
            productLink: 'https://example.com/products/contract-smoke',
            imageUrls: ['https://example.com/images/contract-smoke.jpg'],
            tags: ['smoke', 'contract'],
        },
    });

    const updatedProduct = await request(`/seller/products/${createdProduct._id}`, {
        method: 'PATCH',
        token: sellerToken,
        body: {
            title: `${createdProduct.title} Updated`,
            stock: 7,
            price: 79.0,
        },
    });

    const createdReel = await request('/seller/reels', {
        method: 'POST',
        token: sellerToken,
        body: {
            videoUrl: 'https://example.com/videos/contract-smoke.mp4',
            thumbnailUrl: 'https://example.com/thumbnails/contract-smoke.jpg',
            caption: 'Initial contract smoke reel',
            hashtags: ['contract', 'smoke'],
            region: existingProduct.region,
            category: existingProduct.category,
            taggedProductIds: [existingProduct._id],
        },
    });

    const updatedReel = await request(`/seller/reels/${createdReel._id}`, {
        method: 'PATCH',
        token: sellerToken,
        body: {
            caption: 'Updated contract smoke reel',
            taggedProductIds: [updatedProduct._id],
        },
    });

    const taggedProducts = await request(`/reels/${updatedReel._id}/products`, { token: buyerToken });
    const viewed = await request(`/reels/${updatedReel._id}/view`, { method: 'POST', token: buyerToken, body: {} });
    const clicked = await request(`/products/${updatedProduct._id}/click`, { method: 'POST', token: buyerToken, body: {} });
    const saved = await request(`/products/${updatedProduct._id}/save`, { method: 'POST', token: buyerToken, body: {} });
    const unsaved = await request(`/products/${updatedProduct._id}/save`, { method: 'DELETE', token: buyerToken });

    const deletedReel = await request(`/seller/reels/${updatedReel._id}`, { method: 'DELETE', token: sellerToken });
    const deletedProduct = await request(`/seller/products/${updatedProduct._id}`, { method: 'DELETE', token: sellerToken });

    console.log(JSON.stringify({
        apiBaseUrl: base,
        sellerLogin: Boolean(sellerToken),
        buyerLogin: Boolean(buyerToken),
        createdProductId: createdProduct._id,
        updatedProductStock: updatedProduct.stock,
        createdReelId: createdReel._id,
        updatedReelTaggedProductIds: (updatedReel.taggedProductIds || []).map((item) => item._id || item),
        taggedProductsCount: taggedProducts.length,
        taggedProductIdFromBuyerRead: taggedProducts[0]?._id,
        reelViewCount: viewed.viewCount,
        productClickCount: clicked.clickCount,
        saveResult: { saved: saved.saved, saveCount: saved.saveCount },
        unsaveResult: { saved: unsaved.saved, saveCount: unsaved.saveCount },
        reelDeleted: deletedReel.deleted,
        productDeleted: deletedProduct.deleted,
    }, null, 2));
}

main().catch((error) => {
    console.error(error.message);
    process.exit(1);
});
