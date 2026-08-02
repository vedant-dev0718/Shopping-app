const { api } = require('../helpers/testServer.helper');
const { authHeader, createBuyer, createSeller } = require('../helpers/auth.helper');
const { makeCloudinaryFailOnce } = require('../helpers/cloudinary.mock');

describe('uploads API with mocked Cloudinary', () => {
  test('seller can upload product image and reel video', async () => {
    const seller = await createSeller();

    const image = await api()
      .post('/api/uploads/image')
      .set('Authorization', authHeader(seller))
      .attach('image', Buffer.from('fake-image'), { filename: 'image.jpg', contentType: 'image/jpeg' })
      .expect(201);

    expect(image.body.data.imageUrl).toContain('cloudinary.com');
    expect(image.body.data.publicId).toBeTruthy();

    const video = await api()
      .post('/api/uploads/video')
      .set('Authorization', authHeader(seller))
      .attach('video', Buffer.from('fake-video'), { filename: 'video.mp4', contentType: 'video/mp4' })
      .expect(201);

    expect(video.body.data.videoUrl).toContain('cloudinary.com');
    expect(video.body.data.thumbnailUrl).toContain('cloudinary.com');
  });

  test('upload role, file type, and provider failures return clean errors', async () => {
    const buyer = await createBuyer();
    const seller = await createSeller();

    await api().post('/api/uploads/image').attach('image', Buffer.from('x'), 'image.jpg').expect(401);
    await api()
      .post('/api/uploads/image')
      .set('Authorization', authHeader(buyer))
      .attach('image', Buffer.from('x'), { filename: 'image.jpg', contentType: 'image/jpeg' })
      .expect(403);
    await api()
      .post('/api/uploads/image')
      .set('Authorization', authHeader(seller))
      .attach('image', Buffer.from('x'), { filename: 'notes.txt', contentType: 'text/plain' })
      .expect(400);

    makeCloudinaryFailOnce();
    await api()
      .post('/api/uploads/image')
      .set('Authorization', authHeader(seller))
      .attach('image', Buffer.from('x'), { filename: 'image.jpg', contentType: 'image/jpeg' })
      .expect(500);
  });
});
