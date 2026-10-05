"use strict";

const createIncrementalMutation = require("../../../helpers/createIncrementalMutation");

/** @returns {import("../../../..").Configuration} watch configuration */
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
		createIncrementalMutation({
			name: "missing error recovery",
			detector: "comparison",
			method: "_rebuild",
			before: "if (this.errorModules.size > 0) {",
			after: "if (this.errorModules.size > 0 && (recordMutation(), false)) {"
		})
	]
});
