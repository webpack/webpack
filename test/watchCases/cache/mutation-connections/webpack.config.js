"use strict";

const createWatchMutation = require("../../../helpers/createWatchMutation");

/** @returns {import("webpack").Configuration} watch configuration */
module.exports = () => ({
	mode: "development",
	devtool: false,
	cache: { type: "memory" },
	output: { pathinfo: false },
	optimization: { minimize: false, moduleIds: "named", chunkIds: "named" },
	plugins: [
		createWatchMutation({
			name: "stale outgoing connections",
			detector: "graph",
			fault: "graph"
		})
	]
});
