"use strict";

// The css loading runtime module renders nothing without chunk loading or hmr, and its
// loading branch needs a chunk emitted as css -- which a node target has none of.

/**
 * @param {string} name output sub-directory
 * @param {string} entry entry module
 * @param {import("../../../../").Configuration["target"]} target build target
 * @returns {import("../../../../").Configuration} configuration
 */
const variant = (name, entry, target = ["web", "node"]) => ({
	name,
	target,
	mode: "development",
	devtool: false,
	entry,
	experiments: { css: true, outputModule: true },
	optimization: { chunkIds: "named", minimize: false },
	output: {
		module: true,
		environment: { globalThis: false },
		filename: `${name}/main.mjs`,
		chunkFilename: `${name}/[name].mjs`,
		cssFilename: `${name}/[name].css`,
		cssChunkFilename: `${name}/[name].css`
	}
});

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	variant("no-loading", "./static-entry.js"),
	variant("loading", "./loading-entry.js"),
	variant("node", "./node-entry.js", "node")
];
