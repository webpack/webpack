"use strict";

// Verifies that `byLayer` on object externals is handled correctly:
// the layer-keyed external entries are reserved alongside the top-level
// ones, and `byLayer` itself is not turned into a bogus `require("byLayer")`.
/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		library: {
			name: "demo",
			type: "umd"
		}
	},
	externalsType: "umd",
	externals: {
		fs: "fs",
		byLayer: {
			"some-layer": {
				path: "path"
			}
		}
	},
	experiments: {
		lazyCompilation: {
			entries: false
		}
	}
};
