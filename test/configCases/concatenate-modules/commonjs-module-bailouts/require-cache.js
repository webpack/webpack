"use strict";

// `require.cache` becomes a presentational ConstDependency carrying the
// moduleCache/moduleId/moduleLoaded requirements — the wrapper registers no
// module in the cache, so it must bail out
exports.cached = Object.keys(require.cache).length > 0;
