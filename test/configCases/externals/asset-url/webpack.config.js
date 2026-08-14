"use strict";

const { ExternalModule } = require("../../../../");

const PLUGIN_NAME = "AssertAssetExternalSourceTypesPlugin";

// a css `url()` reads the url out of the external, a javascript `new URL()`
// requires it — so only the css consumer is wrapper-less
const EXPECTED_SOURCE_TYPES = {
	"css-asset": ["asset-url"],
	"css-asset-url": ["asset-url"],
	"css-css-url": ["asset-url"],
	"js-asset": ["javascript"],
	"js-asset-url": ["javascript"],
	"js-css-url": ["javascript"]
};

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	experiments: {
		css: true
	},
	optimization: {
		minimize: false
	},
	externals: {
		"css-asset": "asset https://example.test/css-asset.png",
		"css-asset-url": "asset-url https://example.test/css-asset-url.png",
		// TODO webpack 6 remove, `css-url` is the old spelling of `asset-url`
		"css-css-url": "css-url https://example.test/css-css-url.png",
		"js-asset": "asset https://example.test/js-asset.png",
		"js-asset-url": "asset-url https://example.test/js-asset-url.png",
		"js-css-url": "css-url https://example.test/js-css-url.png"
	},
	plugins: [
		/**
		 * @param {import("../../../../").Compiler} compiler compiler
		 */
		(compiler) => {
			compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
				compilation.hooks.afterSeal.tap(PLUGIN_NAME, () => {
					/** @type {Record<string, string[]>} */
					const actual = {};
					for (const module of compilation.modules) {
						if (!(module instanceof ExternalModule)) continue;
						actual[module.userRequest] = [...module.getSourceTypes()];
					}
					expect(actual).toEqual(EXPECTED_SOURCE_TYPES);
				});
			});
		}
	]
};
