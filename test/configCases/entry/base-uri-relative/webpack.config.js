"use strict";

// A relative `baseUri` is no base of its own. The runtime reads it against the base the
// target would use without one, so the literal spells it beside the chunk — and each
// target has to agree with the url its own runtime would have built.

const webpack = require("../../../../");

/**
 * @param {number} index position of this config, so `index.js` finds its own stats
 * @param {string} name output prefix keeping the emitted files of each config apart
 * @param {boolean} esm whether the config emits ESM output
 * @returns {import("../../../../").Configuration} configuration
 */
const base = (index, name, esm) => ({
	name,
	target: "node",
	mode: "development",
	devtool: false,
	entry: { [name]: { import: "./index.js", baseUri: "app/" } },
	module: { rules: [{ test: /\.txt$/, type: "asset/resource" }] },
	experiments: { outputModule: esm },
	output: {
		module: esm,
		chunkFormat: esm ? "module" : "commonjs",
		environment: esm ? { module: true } : undefined,
		filename: `${name}.${esm ? "mjs" : "js"}`,
		assetModuleFilename: "[name][ext]",
		publicPath: "assets/"
	},
	plugins: [
		new webpack.DefinePlugin({
			__INDEX__: JSON.stringify(index),
			__NAME__: JSON.stringify(name)
		})
	]
});

/** @type {import("../../../../").Configuration[]} */
module.exports = [base(0, "bundle0", true), base(1, "cjs", false)];
