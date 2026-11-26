"use strict";

const { HotModuleReplacementPlugin } = require("../../");

/** @import { Configuration } from "webpack" */

/** @type {Configuration & { devServer: Record<string, EXPECTED_ANY> }} */
const config = {
	mode: "development",
	cache: {
		type: "filesystem",
		idleTimeout: 5000
	},
	experiments: {
		lazyCompilation: true
	},
	devServer: {
		hot: true,
		devMiddleware: {
			publicPath: "/dist/"
		}
	},
	plugins: [new HotModuleReplacementPlugin()]
};

module.exports = config;
