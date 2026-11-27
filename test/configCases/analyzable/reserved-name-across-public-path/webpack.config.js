"use strict";

/** @import { Configuration, WebpackPluginInstance } from "../../../../" */

// A public path ending in `@` and a chunk name starting `@webpack` only spell a
// reserved name together, which the fill pass must leave as written.

/**
 * @param {string} prefix the public path's last segment, which files are served under
 * @param {string} start how the chunk's own name starts
 * @returns {WebpackPluginInstance} a plugin moving the chunk to where it is loaded from
 */
const servePrefixed = (prefix, start) => ({
	apply(compiler) {
		compiler.hooks.compilation.tap("Test", (compilation) => {
			compilation.hooks.processAssets.tap(
				{
					name: "Test",
					stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_REPORT
				},
				(assets) => {
					// where the public path has the chunk loaded from
					for (const name of Object.keys(assets)) {
						if (name.startsWith(start)) {
							compilation.renameAsset(name, `${prefix}${name}`);
						}
					}
				}
			);
		});
	}
});

/**
 * @param {string} entry the entry module
 * @param {string} prefix the public path's last segment
 * @param {string} start how the chunk's own name starts
 * @returns {Configuration} the configuration
 */
const config = (entry, prefix, start) => ({
	target: "node",
	mode: "production",
	devtool: false,
	entry,
	output: {
		module: true,
		publicPath: `./${prefix}`,
		chunkFilename: "[name].[contenthash].mjs"
	},
	optimization: { chunkIds: "named", minimize: false },
	plugins: [servePrefixed(prefix, start)]
});

// `@` | `@webpack...`, and a split further into the name: `@@web` | `pack...`
module.exports = [
	config("./index.js", "prefix@", "@"),
	config("./split.js", "prefix@@web", "pack")
];
