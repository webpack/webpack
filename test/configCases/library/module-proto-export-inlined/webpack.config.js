"use strict";

/** @import { Configuration } from "../../../../" */

/**
 * @param {number} index config index
 * @param {"development" | "production"} mode mode
 * @param {Configuration["optimization"]} optimization optimization options
 * @returns {Configuration} configuration
 */
const createConfig = (index, mode, optimization) => ({
	mode,
	target: "node14",
	entry: {
		main: "./index.js",
		library: { import: "./library.js", library: { type: "module" } }
	},
	output: {
		module: true,
		filename: `[name]-${index}.mjs`,
		chunkFilename: `[name]-${index}.chunk.mjs`
	},
	externalsType: "module",
	externals: { "./library.mjs": `./library-${index}.mjs` },
	optimization: { minimize: false, ...optimization }
});

/** @type {Configuration[]} */
module.exports = [
	createConfig(0, "development", {}),
	createConfig(1, "production", { mangleExports: false }),
	createConfig(2, "production", {
		mangleExports: false,
		concatenateModules: false
	})
];
