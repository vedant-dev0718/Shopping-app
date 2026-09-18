/**
 * Wrapper for async route handlers to catch errors
 * Passes errors to the global error handler middleware
 * 
 * @param {Function} fn - Async route handler function
 * @returns {Function} - Wrapped handler function
 */
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

module.exports = asyncHandler;
