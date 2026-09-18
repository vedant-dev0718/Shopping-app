const { MediaConvertClient, CreateJobCommand } = require('@aws-sdk/client-mediaconvert');
const { S3Client, HeadBucketCommand } = require('@aws-sdk/client-s3');
const env = require('../config/env');
const AppError = require('./AppError');

const isMediaConvertConfigured = () => {
    return Boolean(
        env.awsAccessKeyId
        && env.awsSecretAccessKey
        && env.awsRegion
        && env.awsS3Bucket
    );
};

const getMediaConvertClient = () => {
    const options = {
        region: env.awsRegion,
        credentials: {
            accessKeyId: env.awsAccessKeyId,
            secretAccessKey: env.awsSecretAccessKey
        }
    };

    if (env.awsS3Endpoint) {
        options.endpoint = env.awsS3Endpoint;
    }

    return new MediaConvertClient(options);
};

const createHLSTranscodingJob = async ({ s3InputPath, s3OutputPath, videoMetadata = {} }) => {
    if (!isMediaConvertConfigured()) {
        throw new AppError('Video transcoding is not configured. Enable AWS MediaConvert.', 500);
    }

    // MediaConvert job creates HLS with multiple bitrate variants: 720p, 480p, 360p
    // Output: manifest.m3u8 + segment files (*.ts)
    // URLs returned to iOS app point to the HLS manifest, not raw video

    const jobSettings = {
        Inputs: [
            {
                FileInput: s3InputPath, // s3://bucket/notwhat/sellers/{id}/reels/raw/{filename}
                VideoSelector: {}
            }
        ],
        OutputGroups: [
            {
                Name: 'HLS',
                OutputGroupSettings: {
                    Type: 'HLS_GROUP_SETTINGS',
                    HlsGroupSettings: {
                        Destination: s3OutputPath, // s3://bucket/notwhat/sellers/{id}/reels/hls/
                        SegmentLength: 6,
                        SegmentLengthUnits: 'SECONDS',
                        SegmentsPerSubdirectory: 100,
                        ManifestDurationFormat: 'INTEGER',
                        StreamInfResolution: 'INCLUDE',
                        ServiceUrl: env.awsS3PublicBaseUrl || `https://${env.awsS3Bucket}.s3.${env.awsRegion}.amazonaws.com`,
                        CaptionLanguageMappings: [],
                        CaptionLanguageSetting: 'OMIT',
                        MinSegmentInterval: 0,
                        MinFinalSegmentLength: 0,
                        SegmentControl: 'SEGMENTED_FILES',
                        TargetDurationCompatibilityMode: 'LEGACY'
                    }
                },
                Outputs: [
                    {
                        NameModifier: '_720p',
                        VideoDescription: {
                            Width: 1280,
                            Height: 720,
                            CodecSettings: {
                                Codec: 'H_264',
                                H264Settings: {
                                    Bitrate: 2500,
                                    RateControlMode: 'VBR',
                                    MaxBitrate: 3500,
                                    AdaptiveQuantization: 'AUTO',
                                    EntropyEncoding: 'CABAC',
                                    FramerateControl: 'INITIALIZE_FROM_SOURCE',
                                    ScanTypeConversionMode: 'AUTO'
                                }
                            }
                        },
                        AudioDescriptions: [
                            {
                                CodecSettings: {
                                    Codec: 'AAC',
                                    AacSettings: {
                                        Bitrate: 128,
                                        SampleRate: 48000,
                                        CodingMode: 'CODING_MODE_2_0'
                                    }
                                }
                            }
                        ],
                        ContainerSettings: {
                            Container: 'M3U8'
                        }
                    },
                    {
                        NameModifier: '_480p',
                        VideoDescription: {
                            Width: 854,
                            Height: 480,
                            CodecSettings: {
                                Codec: 'H_264',
                                H264Settings: {
                                    Bitrate: 1200,
                                    RateControlMode: 'VBR',
                                    MaxBitrate: 1800,
                                    AdaptiveQuantization: 'AUTO',
                                    EntropyEncoding: 'CABAC',
                                    FramerateControl: 'INITIALIZE_FROM_SOURCE',
                                    ScanTypeConversionMode: 'AUTO'
                                }
                            }
                        },
                        AudioDescriptions: [
                            {
                                CodecSettings: {
                                    Codec: 'AAC',
                                    AacSettings: {
                                        Bitrate: 96,
                                        SampleRate: 48000,
                                        CodingMode: 'CODING_MODE_2_0'
                                    }
                                }
                            }
                        ],
                        ContainerSettings: {
                            Container: 'M3U8'
                        }
                    },
                    {
                        NameModifier: '_360p',
                        VideoDescription: {
                            Width: 640,
                            Height: 360,
                            CodecSettings: {
                                Codec: 'H_264',
                                H264Settings: {
                                    Bitrate: 600,
                                    RateControlMode: 'VBR',
                                    MaxBitrate: 900,
                                    AdaptiveQuantization: 'AUTO',
                                    EntropyEncoding: 'CABAC',
                                    FramerateControl: 'INITIALIZE_FROM_SOURCE',
                                    ScanTypeConversionMode: 'AUTO'
                                }
                            }
                        },
                        AudioDescriptions: [
                            {
                                CodecSettings: {
                                    Codec: 'AAC',
                                    AacSettings: {
                                        Bitrate: 64,
                                        SampleRate: 48000,
                                        CodingMode: 'CODING_MODE_2_0'
                                    }
                                }
                            }
                        ],
                        ContainerSettings: {
                            Container: 'M3U8'
                        }
                    }
                ]
            }
        ]
    };

    try {
        const command = new CreateJobCommand({
            Role: `arn:aws:iam::${env.awsAccountId}:role/service-role/MediaConvertDefaultRole`,
            Settings: jobSettings,
            StatusUpdateInterval: 'SECONDS_60',
            Priority: 0,
            Tags: {
                notwhat: 'reel-transcoding'
            }
        });

        const client = getMediaConvertClient();
        const response = await client.send(command);

        return {
            jobId: response.Job.Id,
            jobStatus: response.Job.Status,
            hlsManifestUrl: null // populated after transcoding completes
        };
    } catch (error) {
        throw new AppError(`Video transcoding job failed: ${error.message}`, 500);
    }
};

module.exports = {
    isMediaConvertConfigured,
    createHLSTranscodingJob
};
