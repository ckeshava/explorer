module.exports = {
  process(sourceText, sourcePath, options) {
    return { code: 'module.exports = {};' }
  },
  getCacheKey() {
    // The output is always the same.
    // Keshava TODO: Update the cache key
    return 'imageTransform'
  },
}
