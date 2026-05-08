"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: ["web", "es2020"],
	node: {
		__dirname: false,
		__filename: false
	},
	entry: {
		main: "./index.js",
		bundle: "./bundle.js"
	},
	output: {
		filename: "[name].js",
		module: true
	},
	optimization: {
		concatenateModules: true,
		usedExports: true
	},
	experiments: {
		outputModule: true,
		deferImport: true,
		sourceImport: true
	},
	externalsType: "module",
	externals: [
		{
			"ext-defer": "module ext-defer",
			"ext-source": "module ext-source",
			"ext-import-defer": "import ext-import-defer",
			"ext-import-source": "import ext-import-source",
			fs: "commonjs fs",
			path: "commonjs path"
		}
	]
};
