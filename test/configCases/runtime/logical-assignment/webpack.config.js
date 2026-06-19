"use strict";

const webpack = require("../../../../");

/**
 * @param {"web" | "node" | "async-node" | "webworker"} target target
 * @returns {import("../../../../").Configuration} config
 */
function config(target) {
	return {
		name: target,
		target,
		mode: "development",
		devtool: false,
		// Keep the real `__filename` so the test can read its own bundle on every target.
		node: { __dirname: false, __filename: false },
		// Force the operator on regardless of the target's browserslist default.
		output: { environment: { logicalAssignment: true } },
		optimization: { chunkIds: "named" },
		plugins: [new webpack.HotModuleReplacementPlugin()]
	};
}

module.exports = [
	config("web"),
	config("node"),
	config("async-node"),
	config("webworker")
];
