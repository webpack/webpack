"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	target: "node",
	optimization: { moduleIds: "deterministic" },
	performance: {
		hints: "warning",
		unusedConfig: true
	},
	externals: {
		first: "commonjs path",
		second: "commonjs path"
	}
};
