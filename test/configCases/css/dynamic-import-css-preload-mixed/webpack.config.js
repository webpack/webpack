"use strict";

// `dynamicImportCssPreload` must stay CSS-only even when the build ALSO uses a
// JS preload (`webpackPreload`), which registers the JS preload handler. The
// css-preload trigger calls only the CSS handler, so a dynamically imported
// chunk's CSS is preloaded without its JS.
/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: "./index.mjs",
	experiments: { outputModule: true, css: true },
	target: "web",
	output: {
		publicPath: "https://example.com/public/path/",
		module: true,
		filename: "bundle0.mjs",
		chunkFilename: "[name].mjs",
		chunkFormat: "module"
	},
	module: {
		parser: { javascript: { dynamicImportCssPreload: true } }
	},
	performance: { hints: false },
	optimization: { minimize: false, chunkIds: "named" }
};
