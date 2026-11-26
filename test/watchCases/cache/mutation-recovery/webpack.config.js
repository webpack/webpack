"use strict";

const createWatchMutation = require("../../../helpers/createWatchMutation");

/** @import { Configuration } from "webpack" */

/** @returns {Configuration} watch configuration */
module.exports = () => ({
	mode: "development",
	devtool: false,
	cache: { type: "memory" },
	output: { pathinfo: false },
	optimization: {
		emitOnErrors: true,
		minimize: false,
		moduleIds: "named",
		chunkIds: "named"
	},
	plugins: [
		createWatchMutation({
			name: "missing error recovery",
			detector: "comparison",
			fault: "recovery"
		})
	]
});
