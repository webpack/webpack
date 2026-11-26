"use strict";

/** @import { Configuration } from "../../../../types.d.ts" */

/**
 * The split runtime chunk holds the tree requirements for the whole entry, so
 * every target has to resolve it to assign the entry module id.
 * @param {string} name config name
 * @param {Configuration["target"]} target target
 * @param {boolean=} outputModule whether the target needs ESM output
 * @returns {Configuration} config
 */
const config = (name, target, outputModule) => ({
	name,
	target,
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

/** @type {Configuration[]} */
module.exports = [
	config("node", "node"),
	config("web", "web"),
	config("webworker", "webworker"),
	config("universal", ["web", "node"], true)
];
