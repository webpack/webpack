"use strict";

const webpack = require("../../../../");

/** @import { Configuration } from "../../../../" */

/**
 * @param {string} name variant name the tests read
 * @param {Configuration} options variant-specific options
 * @returns {Configuration} configuration
 */
const variant = (name, options) => ({
	devtool: false,
	...options,
	module: {
		rules: [
			{ test: /\.txt$/, type: "asset/source" },
			{
				test: /targets[\\/]side-effect-free(-used)?\.js$/,
				sideEffects: false
			}
		]
	},
	plugins: [
		new webpack.DefinePlugin({
			VARIANT: JSON.stringify(name),
			TREE_SHAKES: JSON.stringify(options.mode === "production")
		})
	]
});

/** @type {Configuration[]} */
module.exports = [
	variant("plain", {
		mode: "production",
		optimization: {
			concatenateModules: false,
			mangleExports: false,
			minimize: false,
			moduleIds: "named"
		}
	}),
	variant("concatenated", {
		mode: "production",
		optimization: {
			concatenateModules: { commonjs: true },
			mangleExports: "deterministic",
			minimize: false
		}
	}),
	variant("minimized", {
		mode: "production",
		optimization: {
			concatenateModules: { commonjs: true },
			mangleExports: "size",
			minimize: true
		}
	}),
	variant("development", { mode: "development" })
];
