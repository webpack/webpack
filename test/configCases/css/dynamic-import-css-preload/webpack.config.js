"use strict";

// `parser.javascript.dynamicImportCssPreload: true` auto-emits
// `<link rel="preload" as="style">` for a dynamically imported chunk's CSS
// (fetched in parallel with the chunk), without preloading its JavaScript.
/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: "./index.mjs",
	experiments: {
		outputModule: true,
		css: true
	},
	target: "web",
	output: {
		publicPath: "https://example.com/public/path/",
		module: true,
		filename: "bundle0.mjs",
		chunkFilename: "[name].mjs",
		chunkFormat: "module"
	},
	module: {
		parser: {
			javascript: {
				dynamicImportCssPreload: true
			}
		}
	},
	performance: { hints: false },
	optimization: { minimize: false, chunkIds: "named" }
};
