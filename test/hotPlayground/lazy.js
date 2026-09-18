// Loaded on demand with import(), so it lands in its own chunk. The importer
// accepts it, which is what makes an async chunk hot-updatable.

module.exports = "This text comes from 'lazy.js', in a chunk of its own.";
