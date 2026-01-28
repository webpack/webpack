"use strict";

/**
 * @param {{ config: import("../../../../").Configuration }} config configuration
 * @returns {import("../../../../").Configuration} configuration
 */
module.exports = ({ config }) => ({
	output: {
		filename: "[name].js"
	},
	optimization: {
		runtimeChunk: config.target !== "webworker",
		splitChunks: {
			chunks: "all",
			minSize: 0
		}
	}
});
