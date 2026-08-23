"use strict";

// Deno reads `import defer` and web does not, so a bundle for both must not
// inherit deno's answer for the whole set.

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: ["web", "deno2.8"],
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
