// Run:
//   node scripts/backfill-media-proxy-urls.js
//   node scripts/backfill-media-proxy-urls.js --dry-run
//   node scripts/backfill-media-proxy-urls.js --api-base-url=https://api.notwhat.in

require('dotenv').config();
const mongoose = require('mongoose');

const env = require('../src/config/env');
const Product = require('../src/modules/products/product.model');
const Reel = require('../src/modules/reels/reel.model');
const Store = require('../src/modules/stores/store.model');
const User = require('../src/modules/users/user.model');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

const cliBaseArg = args.find((arg) => arg.startsWith('--api-base-url='));
const apiBaseUrl = (cliBaseArg && cliBaseArg.split('=')[1])
    || env.apiPublicBaseUrl
    || `http://localhost:${env.port}`;

const normalizedApiBaseUrl = apiBaseUrl.replace(/\/$/, '');

const endpointHost = (() => {
    try {
        return env.awsS3Endpoint ? new URL(env.awsS3Endpoint).host : null;
    } catch (_error) {
        return null;
    }
})();

const publicBaseHost = (() => {
    try {
        return env.awsS3PublicBaseUrl ? new URL(env.awsS3PublicBaseUrl).host : null;
    } catch (_error) {
        return null;
    }
})();

const isS3LikeHost = (host) => {
    if (!host) return false;

    if (host.includes('amazonaws.com') && host.includes('s3')) {
        return true;
    }

    if (endpointHost && host === endpointHost) {
        return true;
    }

    if (publicBaseHost && host === publicBaseHost) {
        return true;
    }

    return false;
};

const extractObjectKeyFromUrl = (rawUrl) => {
    if (typeof rawUrl !== 'string' || rawUrl.trim() === '') {
        return null;
    }

    if (rawUrl.includes('/api/uploads/media/')) {
        return null;
    }

    let parsed;
    try {
        parsed = new URL(rawUrl);
    } catch (_error) {
        return null;
    }

    if (!isS3LikeHost(parsed.host)) {
        return null;
    }

    const path = decodeURIComponent(parsed.pathname || '');

    const bucketPrefix = env.awsS3Bucket ? `/${env.awsS3Bucket}/notwhat/` : null;
    if (bucketPrefix && path.startsWith(bucketPrefix)) {
        return `notwhat/${path.slice(bucketPrefix.length)}`;
    }

    const notwhatIndex = path.indexOf('/notwhat/');
    if (notwhatIndex >= 0) {
        return path.slice(notwhatIndex + 1);
    }

    return null;
};

const toProxyUrl = (objectKey) => {
    return `${normalizedApiBaseUrl}/api/uploads/media/${encodeURIComponent(objectKey)}`;
};

const maybeRewriteUrl = (url) => {
    const key = extractObjectKeyFromUrl(url);
    if (!key) {
        return { changed: false, url };
    }

    const proxyUrl = toProxyUrl(key);
    if (proxyUrl === url) {
        return { changed: false, url };
    }

    return { changed: true, url: proxyUrl, objectKey: key };
};

const rewriteArray = (urls = []) => {
    let changed = false;
    const next = urls.map((value) => {
        const result = maybeRewriteUrl(value);
        if (result.changed) {
            changed = true;
        }
        return result.url;
    });
    return { changed, value: next };
};

const run = async () => {
    await mongoose.connect(env.mongoUri);

    console.log(`Starting media proxy backfill${dryRun ? ' (dry-run)' : ''} using base URL: ${normalizedApiBaseUrl}`);

    let productUpdates = 0;
    let reelUpdates = 0;
    let storeUpdates = 0;
    let userUpdates = 0;

    const products = await Product.find({}, { imageUrls: 1 }).lean();
    for (const product of products) {
        const rewritten = rewriteArray(product.imageUrls || []);
        if (!rewritten.changed) {
            continue;
        }

        productUpdates += 1;
        if (!dryRun) {
            await Product.updateOne({ _id: product._id }, { $set: { imageUrls: rewritten.value } });
        }
    }

    const reels = await Reel.find({}, { videoUrl: 1, thumbnailUrl: 1 }).lean();
    for (const reel of reels) {
        const video = maybeRewriteUrl(reel.videoUrl);
        const thumb = maybeRewriteUrl(reel.thumbnailUrl);
        if (!video.changed && !thumb.changed) {
            continue;
        }

        reelUpdates += 1;
        if (!dryRun) {
            await Reel.updateOne(
                { _id: reel._id },
                {
                    $set: {
                        videoUrl: video.url,
                        thumbnailUrl: thumb.url
                    }
                }
            );
        }
    }

    const stores = await Store.find({}, { profileImageUrl: 1, bannerImageUrl: 1 }).lean();
    for (const store of stores) {
        const profile = maybeRewriteUrl(store.profileImageUrl);
        const banner = maybeRewriteUrl(store.bannerImageUrl);
        if (!profile.changed && !banner.changed) {
            continue;
        }

        storeUpdates += 1;
        if (!dryRun) {
            await Store.updateOne(
                { _id: store._id },
                {
                    $set: {
                        profileImageUrl: profile.url,
                        bannerImageUrl: banner.url
                    }
                }
            );
        }
    }

    const users = await User.find({}, { avatarUrl: 1 }).lean();
    for (const user of users) {
        const avatar = maybeRewriteUrl(user.avatarUrl);
        if (!avatar.changed) {
            continue;
        }

        userUpdates += 1;
        if (!dryRun) {
            await User.updateOne(
                { _id: user._id },
                {
                    $set: {
                        avatarUrl: avatar.url
                    }
                }
            );
        }
    }

    console.log('Media proxy backfill complete.');
    console.log(`Products updated: ${productUpdates}`);
    console.log(`Reels updated: ${reelUpdates}`);
    console.log(`Stores updated: ${storeUpdates}`);
    console.log(`Users updated: ${userUpdates}`);

    await mongoose.disconnect();
};

run().catch(async (error) => {
    console.error('Media proxy backfill failed:', error.message);
    await mongoose.disconnect().catch(() => { });
    process.exit(1);
});
