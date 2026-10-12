"use strict";

const createIncrementalMutation = require("../../../helpers/createIncrementalMutation");

/** @returns {import("../../../..").Configuration} watch configuration */
module.exports = () => ({
	mode: "development",
	devtool: false,
	cache: { type: "memory" },
	output: { pathinfo: false },
	optimization: { minimize: false, moduleIds: "named", chunkIds: "named" },
	plugins: [
		createIncrementalMutation({
			name: "ignored invalidation",
			detector: "comparison",
			method: "_rebuild",
			before: "if (need) {",
			after: "if (need && (recordMutation(), false)) {"
		})
	]
});
