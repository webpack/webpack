"use strict";

// The wrapper goes only once every javascript consumer is a `new URL()` that names
// the file itself; anything reading the url out of the module still needs it.

const webpack = require("../../../../");

/**
 * @param {number} index position of this config, so `index.js` finds its own bundle
 * @param {boolean} wrapper whether the asset module is expected to keep its wrapper
 * @param {import("../../../../").Configuration} extra per-case overrides
 * @param {boolean=} inline whether the call site is expected to name the file itself
 * @returns {import("../../../../").Configuration} configuration
 */
const base = (index, wrapper, extra = {}, inline = false) => ({
	target: "node",
	mode: "development",
	devtool: extra.devtool !== undefined ? extra.devtool : false,
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
			__WRAPPER__: JSON.stringify(wrapper),
			__INLINE__: JSON.stringify(inline)
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
	// A reassigned public path rules the literal out, but the call site concatenates
	// the runtime one itself — going through the wrapper to do it adds nothing.
	base(3, false, { entry: "./index-override.js" }, true),
	// An `eval` devtool rules the literal out the same way, and leaves the same
	// concatenation — `import.meta` is what does not parse there, not `.p`.
	base(4, false, { devtool: "eval" }, true)
];
