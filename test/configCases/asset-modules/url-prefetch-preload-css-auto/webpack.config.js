"use strict";

// Same CSS-only hinted assets as `url-prefetch-preload-css`, but under
// `publicPath: "auto"`. The asset's own url is still a placeholder at this point,
// so the startup hint falls back to the runtime `__webpack_require__.p` form.

const rules = [
	{ test: /\.(png|webp|jpg)$/, prefetch: true },
	{ test: /\.woff2$/, preload: true }
];

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	target: "web",
	experiments: {
		css: true
	},
	output: {
		assetModuleFilename: "[name][ext]",
		publicPath: "auto"
	},
	module: {
		parser: {
			javascript: { urlHints: rules },
			css: { urlHints: rules }
		},
		rules: [
			{
				test: /\.(png|woff2)$/,
				type: "asset/resource"
			}
		]
	}
};
