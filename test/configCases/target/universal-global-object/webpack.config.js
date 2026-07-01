"use strict";

// #6522: universal (web + node) UMD/global libraries must use `globalThis`, not `self`.
/**
 * @param {"umd" | "global"} type library type that embeds the global object
 * @returns {import("../../../../").Configuration} configuration
 */
const config = (type) => ({
	name: type,
	mode: "production",
	target: ["web", "node"],
	// classic (non-ESM) output: the universal target defaults to ESM otherwise
	experiments: { outputModule: false },
	output: {
		filename: `${type}.js`,
		// web + node share no default script chunk format, so pick one explicitly
		chunkFormat: "array-push",
		library: { name: "MyLibrary", type }
	},
	optimization: { minimize: false }
});

/** @type {import("../../../../").Configuration[]} */
module.exports = [config("umd"), config("global")];
