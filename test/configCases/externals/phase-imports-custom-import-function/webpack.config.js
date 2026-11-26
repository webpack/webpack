"use strict";

/** @import { Configuration } from "../../../../" */

// `import.defer(…)` / `import.source(…)` are forms of the native `import(…)`, so a
// custom import function has no phase form — reported rather than dropped.

/** @type {Configuration} */
module.exports = {
	target: "deno2.8",
	entry: "./index.js",
	output: {
		filename: "[name].mjs",
		module: true,
		importFunctionName: "myImport"
	},
	optimization: { concatenateModules: false },
	experiments: {
		deferImport: true,
		sourceImport: true
	},
	externals: {
		"ext-defer": "import ext-defer"
	}
};
