"use strict";

// The `module.exports = .p + name` wrapper exists for javascript that reads the asset's
// url out of the module. A `new URL()` reference names the file itself and reads none,
// so the wrapper goes — but only once every javascript consumer is one of those.

const webpack = require("../../../../");

/**
 * @param {number} index position of this config, so `index.js` finds its own bundle
 * @param {boolean} wrapper whether the asset module is expected to keep its wrapper
 * @param {import("../../../../").Configuration} extra per-case overrides
 * @returns {import("../../../../").Configuration} configuration
 */
const base = (index, wrapper, extra = {}) => ({
	target: "node",
	mode: "development",
	devtool: false,
	entry: extra.entry || "./index.js",
	experiments: { outputModule: true },
	output: {
		module: true,
		publicPath: "auto",
		assetModuleFilename: "[name][ext]",
		...extra.output
	},
	module: {
		rules: [{ test: /\.txt$/, type: "asset/resource" }],
		parser: extra.module && extra.module.parser
	},
	plugins: [
		new webpack.DefinePlugin({
			__INDEX__: JSON.stringify(index),
			__WRAPPER__: JSON.stringify(wrapper)
		})
	]
});

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	// Only `new URL()` consumers — nothing reads the wrapper.
	base(0, false),
	// A plain import wants the url as a value, which only the wrapper provides.
	base(1, true, { entry: "./index-plain.js" }),
	// `url: "relative"` keeps the runtime form, which requires the module.
	base(2, true, {
		module: { parser: { javascript: { url: "relative" } } }
	}),
	// A reassigned public path is only knowable at runtime, so is the wrapper's value.
	base(3, true, { entry: "./index-override.js" })
];
