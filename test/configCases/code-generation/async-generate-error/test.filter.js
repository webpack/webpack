"use strict";

// Async code generation errors are intentionally not cached,
// so this test is incompatible with the cache test runner.
module.exports = (config) => !config.cache;
