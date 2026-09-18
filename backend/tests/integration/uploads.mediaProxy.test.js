const { Readable } = require('stream');

const AppError = require('../../src/utils/AppError');
const uploadService = require('../../src/modules/uploads/upload.service');
const { api } = require('../helpers/testServer.helper');
const { authHeader, createSeller } = require('../helpers/auth.helper');

describe('uploads media proxy', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('upload image response returns media proxy URL for S3-backed uploads', async () => {
        const seller = await createSeller();

        jest.spyOn(uploadService, 'uploadImage').mockResolvedValue({
            imageUrl: 'https://example-s3.invalid/notwhat/sellers/demo/products/image.jpg',
            publicId: 'notwhat/sellers/demo/products/image.jpg',
            objectKey: 'notwhat/sellers/demo/products/image.jpg',
            storageProvider: 's3',
            fileSize: 11,
            mimeType: 'image/jpeg'
        });

        const response = await api()
            .post('/api/uploads/image')
            .set('Authorization', authHeader(seller))
            .attach('image', Buffer.from('fake-image-content'), {
                filename: 'sample.jpg',
                contentType: 'image/jpeg'
            })
            .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.imageUrl).toContain('/api/uploads/media/');
        expect(decodeURIComponent(response.body.data.imageUrl)).toContain('notwhat/sellers/demo/products/image.jpg');
    });

    test('media proxy streams object with cache/safety headers', async () => {
        jest.spyOn(uploadService, 'getMediaObjectStream').mockResolvedValue({
            stream: Readable.from(Buffer.from('hello-media')),
            contentType: 'image/jpeg',
            cacheControl: 'public, max-age=600',
            contentLength: 11,
            etag: '"mock-etag"'
        });

        const response = await api()
            .get('/api/uploads/media/notwhat%2Fsellers%2Fdemo%2Fproducts%2Fimage.jpg')
            .expect(200);

        expect(response.headers['content-type']).toContain('image/jpeg');
        expect(response.headers['cache-control']).toBe('public, max-age=600');
        expect(response.headers['x-content-type-options']).toBe('nosniff');
        expect(response.headers['cross-origin-resource-policy']).toBe('cross-origin');
        expect(response.headers['accept-ranges']).toBe('bytes');
        expect(response.body.toString('utf8')).toBe('hello-media');
    });

    test('media proxy returns 404 for missing object key', async () => {
        jest.spyOn(uploadService, 'getMediaObjectStream').mockRejectedValue(new AppError('Media not found.', 404));

        const response = await api()
            .get('/api/uploads/media/notwhat%2Fsellers%2Fdemo%2Fproducts%2Fmissing.jpg')
            .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Media not found.');
    });

    test('media proxy throttles repeated requests with 429', async () => {
        const streamSpy = jest.spyOn(uploadService, 'getMediaObjectStream');
        streamSpy.mockImplementation(async () => ({
            stream: Readable.from(Buffer.from('throttle-media')),
            contentType: 'image/jpeg',
            cacheControl: 'public, max-age=60',
            contentLength: 14,
            etag: '"rate-limit-etag"'
        }));

        const path = '/api/uploads/media/notwhat%2Fsellers%2Fdemo%2Fproducts%2Frate-limit.jpg';

        await api().get(path).expect(200);
        await api().get(path).expect(200);
        await api().get(path).expect(200);

        const limited = await api().get(path).expect(429);

        expect(limited.body).toEqual({
            success: false,
            message: 'Too many media requests from this IP. Please retry shortly.'
        });
        expect(streamSpy).toHaveBeenCalledTimes(3);
    });
});
