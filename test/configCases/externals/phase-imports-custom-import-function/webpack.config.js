"use strict";

// `import.defer(…)` / `import.source(…)` are forms of the native `import(…)`,
// and a custom import function has no phase form at all — so a phase here must
// be reported rather than dropped, which would import eagerly instead.

/** @type {import("../../../../").Configuration} */
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
		outputModule: true,
		deferImport: true,
		sourceImport: true
	},
	externals: {
		"ext-defer": "import ext-defer"
	}
};
