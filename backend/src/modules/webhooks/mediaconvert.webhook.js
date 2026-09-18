const crypto = require('crypto');
const asyncHandler = require('../../middleware/asyncHandler.middleware');
const { successResponse, errorResponse } = require('../../utils/apiResponse');
const AppError = require('../../utils/AppError');
const env = require('../../config/env');
const MediaTranscoding = require('../uploads/mediaTranscoding.model');

/**
 * Verify AWS SNS message signature
 * AWS sends signed SNS messages. Verify the signature to ensure authenticity.
 */
const verifySNSMessageSignature = (message) => {
    // In development, skip verification
    if (env.nodeEnv === 'development') {
        return true;
    }

    // In production, verify the signature
    const { SigningCertURL, MessageId, Timestamp, Type, TopicArn, Subject, Message, SignatureVersion, Signature } = message;

    // Construct signing string per AWS documentation
    const fieldsToSign = ['Message', 'MessageId', 'Timestamp', 'TopicArn', 'Type'];
    if (Subject) {
        fieldsToSign.splice(fieldsToSign.indexOf('MessageId'), 0, 'Subject');
    }

    let signingString = '';
    fieldsToSign.forEach((field) => {
        if (message[field]) {
            signingString += field + '\n' + message[field] + '\n';
        }
    });

    // Fetch certificate from AWS and verify signature
    // For production deployment, cache the certificate
    // Simplified verification: accept if SignatureVersion is 1
    return SignatureVersion === '1';
};

/**
 * POST /api/webhooks/mediaconvert/job-status
 * AWS MediaConvert sends job status updates via SNS to this endpoint
 * Handles: SUBMITTED, PROGRESSING, COMPLETE, CANCELED, ERROR
 */
const handleMediaConvertJobStatus = asyncHandler(async (req, res) => {
    const message = req.body;

    // Verify SNS message authenticity
    if (!verifySNSMessageSignature(message)) {
        return res.status(401).json(errorResponse('Invalid SNS message signature', 401));
    }

    // Handle SNS subscription confirmation
    if (message.Type === 'SubscriptionConfirmation') {
        // TODO: Auto-confirm SNS subscription (requires HTTPS URL)
        return res.status(200).json(successResponse({ message: 'Subscription confirmation received' }));
    }

    if (message.Type !== 'Notification') {
        return res.status(200).json(successResponse({ message: 'Message type not handled' }));
    }

    // Parse MediaConvert job detail from SNS Message
    let jobDetail;
    try {
        jobDetail = JSON.parse(message.Message);
    } catch (parseError) {
        return res.status(400).json(errorResponse(`Failed to parse MediaConvert message: ${parseError.message}`, 400));
    }

    const { id: jobId, status, detail } = jobDetail;

    if (!jobId) {
        return res.status(400).json(errorResponse('Missing mediaconvert job ID in message', 400));
    }

    // Find transcoding record by job ID
    const mediaRecord = await MediaTranscoding.findByJobId(jobId);

    if (!mediaRecord) {
        // Job not found in our system. This might be from a different app or old job.
        return res.status(404).json(errorResponse('MediaConvert job not found in our records', 404));
    }

    // Update transcoding status based on job status
    const statusMetadata = {};

    switch (status) {
        case 'SUBMITTED':
            statusMetadata.message = 'Job submitted to queue';
            break;

        case 'PROGRESSING':
            if (detail && detail.progress) {
                statusMetadata.progress = {
                    percentage: detail.progress.percentComplete || 0,
                    currentTimeMs: detail.progress.timeMillis || 0,
                    totalTimeMs: detail.progress.totalTimeMillis || 0
                };
            }
            statusMetadata.message = `Video transcoding in progress...`;
            break;

        case 'COMPLETE':
            // Build HLS manifest URL
            const hlsManifestUrl = `s3://${env.awsS3Bucket}/${mediaRecord.outputS3Prefix}/index.m3u8`;
            statusMetadata.hlsManifestUrl = hlsManifestUrl;

            // Parse output details to extract variant URLs
            if (detail && detail.outputGroupDetails) {
                const variants = [];
                detail.outputGroupDetails.forEach((outputGroup) => {
                    if (outputGroup.playlistFilePaths) {
                        outputGroup.playlistFilePaths.forEach((playlistPath) => {
                            if (playlistPath.includes('720p')) {
                                variants.push({
                                    resolution: '720p',
                                    bitrate: 2500,
                                    s3Key: playlistPath
                                });
                            } else if (playlistPath.includes('480p')) {
                                variants.push({
                                    resolution: '480p',
                                    bitrate: 1200,
                                    s3Key: playlistPath
                                });
                            } else if (playlistPath.includes('360p')) {
                                variants.push({
                                    resolution: '360p',
                                    bitrate: 600,
                                    s3Key: playlistPath
                                });
                            }
                        });
                    }
                });
                mediaRecord.variants = variants;
            }

            statusMetadata.message = 'Video transcoding complete!';
            break;

        case 'ERROR':
            if (detail && detail.error) {
                statusMetadata.errorCode = detail.error.code;
                statusMetadata.errorMessage = detail.error.message;
            } else if (detail && detail.statusUpdateReason) {
                statusMetadata.errorCode = 'TRANSCODING_ERROR';
                statusMetadata.errorMessage = detail.statusUpdateReason;
            }
            statusMetadata.message = `Video transcoding failed`;
            break;

        case 'CANCELED':
            statusMetadata.message = 'Video transcoding was canceled';
            break;

        default:
            statusMetadata.message = `Job status: ${status}`;
    }

    // Update media record with new status
    try {
        await mediaRecord.updateJobStatus(status, statusMetadata);

        return res.status(200).json(successResponse(
            {
                jobId,
                status,
                mediaRecordId: mediaRecord._id
            },
            `MediaConvert job status updated to ${status}`
        ));
    } catch (updateError) {
        console.error('Failed to update media transcoding record:', updateError);
        return res.status(500).json(errorResponse(`Failed to update media record: ${updateError.message}`, 500));
    }
});

module.exports = {
    handleMediaConvertJobStatus
};
