const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { createReadStream } = require('fs');
const env = require('../config/env');

const getS3Client = () => new S3Client({
    region: env.awsRegion,
    endpoint: env.awsS3Endpoint || undefined,
    forcePathStyle: env.awsS3ForcePathStyle || false,
    credentials: { accessKeyId: env.awsAccessKeyId, secretAccessKey: env.awsSecretAccessKey }
});

const toPublicS3Url = (key) => {
    if (env.awsS3PublicBaseUrl) return `${env.awsS3PublicBaseUrl.replace(/\/$/, '')}/${key}`;
    if (env.awsRegion === 'us-east-1') return `https://${env.awsS3Bucket}.s3.amazonaws.com/${key}`;
    return `https://${env.awsS3Bucket}.s3.${env.awsRegion}.amazonaws.com/${key}`;
};

// Convert MP4 to HLS segments in a temp directory
const convertToHLS = (inputPath, outputDir) => new Promise((resolve, reject) => {
    const manifestPath = path.join(outputDir, 'manifest.m3u8');

    ffmpeg(inputPath)
        .outputOptions([
            '-codec: copy',        // copy streams without re-encoding where possible
            '-start_number 0',
            '-hls_time 6',         // 6-second segments
            '-hls_list_size 0',    // keep all segments in manifest
            '-hls_segment_filename', path.join(outputDir, 'segment%03d.ts'),
            '-f hls'
        ])
        .output(manifestPath)
        .on('end', () => resolve(manifestPath))
        .on('error', reject)
        .run();
});

// Upload all HLS files (manifest + segments) from local dir to S3
const uploadHLSFilesToS3 = async (localDir, s3Prefix) => {
    const s3 = getS3Client();
    const files = fs.readdirSync(localDir);

    await Promise.all(files.map(async (filename) => {
        const filePath = path.join(localDir, filename);
        const s3Key = `${s3Prefix}/${filename}`;
        const contentType = filename.endsWith('.m3u8') ? 'application/x-mpegURL' : 'video/MP2T';

        await s3.send(new PutObjectCommand({
            Bucket: env.awsS3Bucket,
            Key: s3Key,
            Body: createReadStream(filePath),
            ContentType: contentType,
            CacheControl: filename.endsWith('.m3u8') ? 'no-cache' : 'public, max-age=31536000'
        }));
    }));

    return files;
};

// Full pipeline: download raw MP4 from S3, convert to HLS, upload segments back to S3
const transcodeS3VideoToHLS = async ({ sourceS3Key, outputS3Prefix, onProgress }) => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hls-'));
    const inputPath = path.join(tmpDir, 'input.mp4');
    const outputDir = path.join(tmpDir, 'hls');
    fs.mkdirSync(outputDir);

    try {
        // 1. Download source MP4 from S3
        const { GetObjectCommand } = require('@aws-sdk/client-s3');
        const s3 = getS3Client();
        const { Body } = await s3.send(new GetObjectCommand({ Bucket: env.awsS3Bucket, Key: sourceS3Key }));

        await new Promise((resolve, reject) => {
            const writeStream = fs.createWriteStream(inputPath);
            Body.pipe(writeStream);
            writeStream.on('finish', resolve);
            writeStream.on('error', reject);
        });

        if (onProgress) onProgress(25);

        // 2. Convert to HLS using FFmpeg
        await convertToHLS(inputPath, outputDir);
        if (onProgress) onProgress(75);

        // 3. Upload HLS files to S3
        const uploadedFiles = await uploadHLSFilesToS3(outputDir, outputS3Prefix);
        if (onProgress) onProgress(100);

        const manifestKey = `${outputS3Prefix}/manifest.m3u8`;
        return {
            manifestKey,
            manifestUrl: toPublicS3Url(manifestKey),
            segmentCount: uploadedFiles.filter(f => f.endsWith('.ts')).length
        };
    } finally {
        // Clean up temp files
        fs.rmSync(tmpDir, { recursive: true, force: true });
    }
};

// Transcode a local file directly (used during upload flow)
const transcodeLocalVideoToHLS = async ({ inputPath, outputS3Prefix, onProgress }) => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hls-'));
    const outputDir = path.join(tmpDir, 'hls');
    fs.mkdirSync(outputDir);

    try {
        if (onProgress) onProgress(10);

        await convertToHLS(inputPath, outputDir);
        if (onProgress) onProgress(70);

        const uploadedFiles = await uploadHLSFilesToS3(outputDir, outputS3Prefix);
        if (onProgress) onProgress(100);

        const manifestKey = `${outputS3Prefix}/manifest.m3u8`;
        return {
            manifestKey,
            manifestUrl: toPublicS3Url(manifestKey),
            segmentCount: uploadedFiles.filter(f => f.endsWith('.ts')).length
        };
    } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    }
};

const isFfmpegAvailable = () => new Promise((resolve) => {
    ffmpeg.getAvailableFormats((err) => resolve(!err));
});

module.exports = { transcodeS3VideoToHLS, transcodeLocalVideoToHLS, isFfmpegAvailable };
