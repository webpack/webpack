"use strict";

// One minor below the version that implements it: `import defer` is Deno >= 2.8,
// so 2.7 must be reported rather than emitted.

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "deno2.7",
	entry: "./index.js",
	output: {
		filename: "[name].js",
		module: true
	},
	optimization: { concatenateModules: false },
	experiments: {
		outputModule: true,
		deferImport: true
	},
	externals: {
		"ext-defer": "module ext-defer"
	}
};
