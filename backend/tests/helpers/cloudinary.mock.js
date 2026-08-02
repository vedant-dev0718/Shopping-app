const { v2: cloudinary } = require('cloudinary');

const makeCloudinaryFailOnce = (message = 'Cloudinary test failure') => {
  cloudinary.uploader.upload_stream.mockImplementationOnce((_options, callback) => {
    const { PassThrough } = require('stream');
    const stream = new PassThrough();
    stream.on('finish', () => callback(new Error(message)));
    return stream;
  });
};

module.exports = {
  cloudinary,
  makeCloudinaryFailOnce
};
