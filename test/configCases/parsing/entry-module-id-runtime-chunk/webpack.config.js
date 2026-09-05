"use strict";

/**
 * The split runtime chunk holds the tree requirements for the whole entry, so
 * every target has to resolve it to assign the entry module id.
 * @param {string} name config name
 * @param {import("../../../../types").Configuration["target"]} target target
 * @param {boolean=} outputModule whether the target needs ESM output
 * @returns {import("../../../../types").Configuration} config
 */
const config = (name, target, outputModule) => ({
	name,
	target,
	experiments: outputModule ? { outputModule: true } : {},
	output: {
		module: outputModule,
		filename: `${name}.[name].${outputModule ? "mjs" : "js"}`,
		chunkFilename: `${name}.[name].${outputModule ? "mjs" : "js"}`
	},
	optimization: {
		minimize: false,
		runtimeChunk: "single"
	}
});

/** @type {import("../../../../types").Configuration[]} */
module.exports = [
	config("node", "node"),
	config("web", "web"),
	config("webworker", "webworker"),
	config("universal", ["web", "node"], true)
];
