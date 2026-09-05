"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	// Without `nodeEnv` webpack adds no DefinePlugin at all, so nothing declared.
	optimization: { nodeEnv: false },
	performance: {
		hints: "warning",
		unusedConfig: true
	}
};
