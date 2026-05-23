/**
 * Wrap an async express handler — forwards errors to next()
 */
const catchAsync = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Pick specific keys from an object
 */
const pick = (object, keys) =>
  keys.reduce((obj, key) => {
    if (object && Object.prototype.hasOwnProperty.call(object, key)) {
      obj[key] = object[key];
    }
    return obj;
  }, {});

/**
 * Build pagination metadata and LIMIT/OFFSET values
 */
const buildPagination = (page = 1, limit = 10) => {
  const p = Math.max(parseInt(page, 10) || 1, 1);
  const l = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
  const safeLimit  = l | 0;
  const safeOffset = ((p - 1) * l) | 0;

  const paginate = (rows, totalResults) => ({
    results:      rows,
    page:         p,
    limit:        safeLimit,
    totalPages:   Math.ceil(Number(totalResults) / safeLimit),
    totalResults: Number(totalResults),
  });

  return { limit: safeLimit, offset: safeOffset, paginate };
};

module.exports = { catchAsync, pick, buildPagination };
