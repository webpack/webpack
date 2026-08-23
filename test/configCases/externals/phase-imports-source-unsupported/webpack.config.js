"use strict";

// `import source` is Node >= 24.5, so 24.4 must be reported rather than emitted.

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node24.4",
	entry: "./index.js",
	output: {
		filename: "[name].mjs",
		module: true
	},
	optimization: { concatenateModules: false },
	experiments: {
		outputModule: true,
		sourceImport: true
	},
	externals: {
		"ext-source": "module ext-source"
	}
};
