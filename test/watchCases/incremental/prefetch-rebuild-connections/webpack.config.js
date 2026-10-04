"use strict";

const { AutomaticPrefetchPlugin } = require("../../../..");

/** @type {import("../../../..").Configuration[]} */
module.exports = ["development", "production"].map((mode, index) => ({
	mode: /** @type {"development" | "production"} */ (mode),
	devtool: false,
	cache: { type: index === 0 ? "memory" : "filesystem" },
	output: { clean: false, pathinfo: false, filename: `bundle${index}.js` },
	optimization: { minimize: false, moduleIds: "named", chunkIds: "named" },
	resolveLoader: { alias: { uncached: require.resolve("./loader") } },
	plugins: [new AutomaticPrefetchPlugin()]
}));
