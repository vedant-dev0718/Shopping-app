const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const os = require('os');
const AppError = require('./AppError');

/**
 * Image optimization for multiple resolutions and formats
 * Generates optimized variants: thumbnail (200px), mobile (640px), tablet (1024px)
 */

const OPTIMIZATION_PRESETS = {
    thumbnail: {
        width: 200,
        quality: 80,
        formats: ['webp', 'jpeg'] // Primary: WebP, fallback: JPEG
    },
    mobile: {
        width: 640,
        quality: 82,
        formats: ['webp', 'jpeg']
    },
    tablet: {
        width: 1024,
        quality: 85,
        formats: ['webp', 'jpeg']
    },
    avatar: {
        width: 256,
        quality: 85,
        formats: ['webp', 'jpeg']
    },
    banner: {
        width: 1440,
        quality: 85,
        formats: ['webp', 'jpeg']
    }
};

/**
 * Generate optimized image variants
 * @param {Buffer} inputBuffer - Image file buffer
 * @param {string} filename - Original filename
 * @param {string} presetName - Optimization preset: 'thumbnail' | 'mobile' | 'tablet' | 'avatar' | 'banner'
 * @returns {Promise<Array>} Array of {filename, buffer, format, width}
 */
const generateOptimizedVariants = async (inputBuffer, filename, presetName = 'mobile') => {
    const preset = OPTIMIZATION_PRESETS[presetName] || OPTIMIZATION_PRESETS.mobile;
    const basename = path.parse(filename).name;
    const variants = [];

    try {
        // Get original image metadata to preserve aspect ratio
        const metadata = await sharp(inputBuffer).metadata();

        if (!metadata.width || !metadata.height) {
            throw new AppError('Unable to read image dimensions', 400);
        }

        // Generate variants for each format
        for (const format of preset.formats) {
            const transformer = sharp(inputBuffer)
                .resize(preset.width, Math.round((preset.width / metadata.width) * metadata.height), {
                    withoutEnlargement: true,
                    fit: 'contain',
                    background: { r: 255, g: 255, b: 255, alpha: 0 }
                });

            let buffer;
            const variantFilename = `${basename}-${presetName}.${format === 'webp' ? 'webp' : 'jpg'}`;

            if (format === 'webp') {
                buffer = await transformer.webp({ quality: preset.quality }).toBuffer();
            } else if (format === 'jpeg') {
                buffer = await transformer.jpeg({ quality: preset.quality, progressive: true }).toBuffer();
            }

            variants.push({
                filename: variantFilename,
                buffer,
                format,
                width: preset.width,
                size: buffer.length
            });
        }

        return variants;
    } catch (error) {
        throw new AppError(`Image optimization failed: ${error.message}`, 500);
    }
};

/**
 * Optimize a single image to WebP and JPEG (primary and fallback)
 * Returns buffers for S3 upload
 */
const optimizeImage = async (inputBuffer, filename, options = {}) => {
    const {
        width = 640,
        quality = 82,
        withThumbnail = false
    } = options;

    try {
        const metadata = await sharp(inputBuffer).metadata();

        if (!metadata.width || !metadata.height) {
            throw new AppError('Unable to read image dimensions', 400);
        }

        const basename = path.parse(filename).name;
        const results = {};

        // Main image
        const mainTransformer = sharp(inputBuffer)
            .resize(width, Math.round((width / metadata.width) * metadata.height), {
                withoutEnlargement: true,
                fit: 'contain',
                background: { r: 255, g: 255, b: 255, alpha: 0 }
            });

        // WebP (primary)
        results.webp = {
            buffer: await mainTransformer.clone().webp({ quality }).toBuffer(),
            filename: `${basename}.webp`,
            format: 'webp'
        };

        // JPEG (fallback)
        results.jpeg = {
            buffer: await mainTransformer.clone().jpeg({ quality, progressive: true }).toBuffer(),
            filename: `${basename}.jpg`,
            format: 'jpeg'
        };

        // Thumbnail if requested
        if (withThumbnail) {
            const thumbTransformer = sharp(inputBuffer)
                .resize(200, Math.round((200 / metadata.width) * metadata.height), {
                    withoutEnlargement: true,
                    fit: 'contain',
                    background: { r: 255, g: 255, b: 255, alpha: 0 }
                });

            results.thumbnail = {
                buffer: await thumbTransformer.webp({ quality: 75 }).toBuffer(),
                filename: `${basename}-thumb.webp`,
                format: 'webp'
            };
        }

        return results;
    } catch (error) {
        throw new AppError(`Image optimization failed: ${error.message}`, 500);
    }
};

module.exports = {
    generateOptimizedVariants,
    optimizeImage,
    OPTIMIZATION_PRESETS
};
