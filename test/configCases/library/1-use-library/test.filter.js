"use strict";

// The amd-runtimeChunk variants pull the library through a `promise` external,
// which is still settling when the harness deletes the `webpack*` chunk-loading
// globals after execution. Node gives every test file a fresh global so the
// reload succeeds; Bun shares one per worker thread, so the second suite to run
// this case (ConfigTestCases vs ConfigCacheTestCases) loses the registration.
module.exports = function filter() {
	return !process.versions.bun;
};
