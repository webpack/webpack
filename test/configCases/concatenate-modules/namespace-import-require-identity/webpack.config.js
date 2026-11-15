"use strict";

const webpack = require("../../../../");

/** @import { Configuration } from "../../../../" */

/**
 * @param {string} name variant name the test reads
 * @param {NonNullable<Configuration["optimization"]>} optimization optimization options
 * @returns {Configuration} configuration
 */
const variant = (name, optimization) => ({
	mode: "production",
	devtool: false,
	optimization: { minimize: false, ...optimization },
	plugins: [new webpack.DefinePlugin({ VARIANT: JSON.stringify(name) })]
});

/** @type {Configuration[]} */
module.exports = [
	variant("unmangled", { concatenateModules: true, mangleExports: false }),
	variant("deterministic", {
		concatenateModules: true,
		mangleExports: "deterministic"
	}),
	variant("size", { concatenateModules: true, mangleExports: "size" }),
	variant("commonjs", {
		concatenateModules: { commonjs: true },
		mangleExports: "deterministic"
	})
];
