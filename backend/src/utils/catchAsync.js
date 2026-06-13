/**
 * Return a function that executes the callback, catching any errors and forwarding them to next()
 * @param {Function} fn Async controller handler
 * @returns {Function}
 */
const catchAsync = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch((err) => next(err));
};

module.exports = catchAsync;
