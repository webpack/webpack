"use strict";

const createWatchMutation = require("../../../helpers/createWatchMutation");

/** @import { Configuration } from "webpack" */

/** @returns {Configuration} watch configuration */
module.exports = () => ({
	mode: "development",
	devtool: false,
	cache: { type: "memory" },
	output: { pathinfo: false },
	optimization: { minimize: false, moduleIds: "named", chunkIds: "named" },
	plugins: [
		createWatchMutation({
			name: "ignored invalidation",
			detector: "comparison",
			fault: "invalidation"
		})
	]
});
