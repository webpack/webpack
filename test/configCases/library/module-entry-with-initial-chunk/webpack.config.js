"use strict";

/** @import { Configuration } from "../../../../" */

/**
 * The split chunk loads with the entry, so the entry is executed as a factory
 * rather than inlined into the startup, and the export definitions it left out
 * on demand are put back there — the helpers they read have to stay.
 * @param {string} name config name
 * @param {boolean} concatenateModules whether to concatenate modules
 * @returns {Configuration} configuration
 */
const createConfig = (name, concatenateModules) => ({
	mode: "production",
	name,
	entry: { [name]: "./index.js" },
	output: {
		module: true,
		filename: "[name].mjs",
		chunkFormat: "module",
		library: {
			type: "module"
		}
	},
	optimization: {
		minimize: false,
		concatenateModules,
		splitChunks: {
			cacheGroups: {
				side: {
					test: /side\.js$/,
					chunks: "all",
					name: "side",
					enforce: true
				}
			}
		}
	}
});

/** @type {Configuration[]} */
module.exports = [
	createConfig("concat", true),
	createConfig("no-concat", false)
];
