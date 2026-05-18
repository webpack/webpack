// CJS wrapper that re-exports an ESM with a `"module.exports"` named export
// via `module.exports = require()`. Node returns whatever `require()` returns,
// so this CJS module's `module.exports` becomes the unwrapped value.
module.exports = require("./value.mjs");
