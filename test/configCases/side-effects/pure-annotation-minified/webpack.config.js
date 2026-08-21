"use strict";

/** @type {import("../../../../types").Configuration} */
module.exports = {
	target: "node",
	mode: "production",
	output: {
		filename: "bundle0.mjs",
		library: { type: "module" },
		module: true
	},
	module: {
		rules: [{ test: /[\\/]pure-cjs\.js$/, sideEffects: false }]
	},
	optimization: {
		minimize: true,
		// `"..."` keeps webpack's own default minimizer, so the case runs the
		// terser options `defaults.js` picks for a library.
		minimizer: ["..."]
	},
	experiments: { outputModule: true }
};
