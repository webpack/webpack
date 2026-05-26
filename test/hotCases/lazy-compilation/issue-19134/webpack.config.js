"use strict";

// Mirrors the configuration from https://github.com/webpack/webpack/issues/19134:
// a UMD micro-frontend bundle with multiple closure-bound externals where
// `lazyCompilation` defers the entry's dependents. Before the fix, the first
// activation throws `__WEBPACK_EXTERNAL_MODULE_react__ is not defined` because
// the initial UMD wrapper didn't reserve closure identifiers for externals
// that weren't yet referenced by the inactive proxy.
/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		library: {
			name: "demo",
			type: "umd"
		}
	},
	externals: {
		fs: "fs",
		path: "path"
	},
	externalsType: "umd",
	experiments: {
		lazyCompilation: {
			entries: false
		}
	}
};
