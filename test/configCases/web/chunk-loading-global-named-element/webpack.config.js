"use strict";

/**
 * @param {string} prefix file name prefix
 * @param {import("../../../../").Configuration["optimization"]} optimization optimization
 * @returns {import("../../../../").Configuration} config
 */
const config = (prefix, optimization) => ({
	target: "web",
	output: {
		filename: `${prefix}[name].js`,
		chunkFilename: `${prefix}[name].js`,
		uniqueName: "my-app"
	},
	optimization: {
		chunkIds: "named",
		...optimization
	}
});

module.exports = [
	// the runtime takes over the global in the entry chunk
	config("", {}),
	// the entry chunk pushes onto the global before the runtime runs
	config("single-", { runtimeChunk: "single" })
];
