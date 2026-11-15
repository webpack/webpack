"use strict";

// Absolute `https://` URLs in HTML become externals on a `web` target
// (`externalsPresets.web`). They must be emitted as written, the way a CSS
// `url()` to the same URL is, instead of degrading to `data:,`.
/** @type {import("../../../../").Configuration} */
module.exports = {
	devtool: false,
	target: "web",
	output: {
		assetModuleFilename: "[name][ext]"
	},
	module: {
		rules: [
			{
				test: /fragment\.html$/,
				parser: { as: "template" },
				generator: { extract: false }
			}
		]
	},
	experiments: {
		html: true
	}
};
