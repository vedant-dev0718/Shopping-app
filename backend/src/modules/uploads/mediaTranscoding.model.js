const mongoose = require('mongoose');

const mediaTranscodingSchema = new mongoose.Schema(
    {
        contentType: {
            type: String,
            enum: ['reel', 'product-thumbnail'],
            required: true
        },
        sellerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        sourceS3Key: {
            type: String,
            required: true
        },
        sourceSize: Number,
        sourceMetadata: {
            width: Number,
            height: Number,
            duration: Number,
            codec: String,
            bitrate: Number
        },
        mediaConvertJobId: {
            type: String,
            required: true,
            unique: true
        },
        jobStatus: {
            type: String,
            enum: ['SUBMITTED', 'PROGRESSING', 'COMPLETE', 'CANCELED', 'ERROR'],
            default: 'SUBMITTED'
        },
        jobErrorCode: String,
        jobErrorMessage: String,
        outputS3Prefix: {
            type: String,
            required: true
        },
        hlsManifestUrl: String,
        dashManifestUrl: String,
        variants: [
            {
                resolution: String,
                bitrate: Number,
                s3Key: String,
                url: String
            }
        ],
        transcodingProgress: {
            percentage: Number,
            currentTimeMs: Number,
            totalTimeMs: Number
        },
        completedAt: Date,
        expiresAt: {
            type: Date,
            default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30-day retention
        }
    },
    {
        timestamps: true,
        collection: 'mediaTranscodings'
    }
);

// Indexes for efficient job lookup and TTL cleanup
mediaTranscodingSchema.index({ sellerId: 1, contentType: 1, createdAt: -1 });
mediaTranscodingSchema.index({ jobStatus: 1, contentType: 1 });
mediaTranscodingSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

mediaTranscodingSchema.statics.createTranscodingJob = async function (jobData) {
    const job = new this({
        contentType: jobData.contentType,
        sellerId: jobData.sellerId,
        sourceS3Key: jobData.sourceS3Key,
        sourceSize: jobData.sourceSize,
        sourceMetadata: jobData.sourceMetadata,
        mediaConvertJobId: jobData.mediaConvertJobId,
        outputS3Prefix: jobData.outputS3Prefix,
        jobStatus: 'SUBMITTED'
    });

    return job.save();
};

mediaTranscodingSchema.statics.findByJobId = async function (jobId) {
    return this.findOne({ mediaConvertJobId: jobId });
};

mediaTranscodingSchema.methods.updateJobStatus = async function (status, metadata = {}) {
    this.jobStatus = status;

    if (metadata.errorCode) {
        this.jobErrorCode = metadata.errorCode;
        this.jobErrorMessage = metadata.errorMessage;
    }

    if (metadata.progress) {
        this.transcodingProgress = metadata.progress;
    }

    if (metadata.hlsManifestUrl) {
        this.hlsManifestUrl = metadata.hlsManifestUrl;
    }

    if (status === 'COMPLETE') {
        this.completedAt = new Date();
    }

    return this.save();
};

module.exports = mongoose.model('MediaTranscoding', mediaTranscodingSchema);
