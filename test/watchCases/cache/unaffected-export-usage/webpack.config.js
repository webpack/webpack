"use strict";

/** @type {import("webpack").Configuration[]} */
module.exports = ["memory", "filesystem"].map((type) => ({
	mode: "development",
	cache: type === "memory" ? { type: "memory" } : { type: "filesystem" },
	experiments: { cacheUnaffected: true },
	optimization: {
		usedExports: true,
		mangleExports: "deterministic",
		sideEffects: false
	},
	output: { filename: `${type}-[name].js`, clean: false }
}));
