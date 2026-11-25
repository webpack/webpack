"use strict";

/** @type {import("webpack").Configuration[]} */
module.exports = ["memory", "filesystem"].map((type) => ({
	mode: "development",
	cache: { type: type === "memory" ? "memory" : "filesystem" },
	experiments: { cacheUnaffected: true },
	optimization: {
		usedExports: true,
		mangleExports: "deterministic",
		sideEffects: false
	},
	output: { filename: `${type}-[name].js`, clean: false }
}));
