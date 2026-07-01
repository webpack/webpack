"use strict";

// #6522: a UMD/global library built for both web and node must resolve
// output.globalObject to `globalThis`, not `self` (undefined in node), so the
// bundle can be require()d there. Both types below embed the global object.
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
