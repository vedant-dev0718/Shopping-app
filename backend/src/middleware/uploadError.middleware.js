const multer = require('multer');

/**
 * Middleware to handle multer upload errors
 * Catches file size, file count, and other multer-specific errors
 */
const handleUploadError = (err, _req, res, next) => {
    // Handle multer file size error
    if (err instanceof multer.MulterError) {
        if (err.code === 'FILE_TOO_LARGE' || err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: 'File is too large',
                details: `Maximum file size is ${err.limit} bytes`
            });
        }

        if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
                success: false,
                message: 'Too many files uploaded',
                details: 'Maximum number of files exceeded'
            });
        }

        if (err.code === 'LIMIT_PART_COUNT') {
            return res.status(400).json({
                success: false,
                message: 'Too many parts in form data'
            });
        }

        if (err.code === 'LIMIT_FIELD_KEY') {
            return res.status(400).json({
                success: false,
                message: 'Field name too long'
            });
        }

        if (err.code === 'LIMIT_FIELD_VALUE') {
            return res.status(400).json({
                success: false,
                message: 'Field value too long'
            });
        }

        // Generic multer error
        return res.status(400).json({
            success: false,
            message: 'Upload error',
            details: err.message
        });
    }

    // Handle unexpected errors
    // Pass to global error handler
    next(err);
};

module.exports = { handleUploadError };
