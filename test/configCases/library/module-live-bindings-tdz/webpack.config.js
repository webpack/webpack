"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration[]} */
module.exports = [false, true].map((concatenateModules, index) => ({
	target: "node14",
	entry: {
		main: "./index.js",
		library: { import: "./library.js", library: { type: "module" } }
	},
	output: { module: true, filename: `[name]-${index}.mjs` },
	externalsType: "module",
	externals: { "./library.mjs": `./library-${index}.mjs` },
	optimization: { concatenateModules }
}));
