"use strict";

// The case asserts that `webpack()` throws before it compiles, and the cache
// suite's pre-compile runs have nowhere to report that — not a cache problem.
module.exports = (config) => !config.cache;
