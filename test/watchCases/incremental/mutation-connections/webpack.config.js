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
			name: "stale outgoing connections",
			detector: "graph",
			method: "removePreRebuildConnections",
			before:
				"this._compilation.removeReasonsOfDependencyBlock(module, staleReferences);",
			after: "recordMutation(); return;"
		})
	]
});
