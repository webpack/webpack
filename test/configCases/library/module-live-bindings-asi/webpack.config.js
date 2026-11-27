"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration[]} */
module.exports = ["node14", "web"].map((target, index) => ({
	target,
	entry: {
		main: "./index.js",
		library: { import: "./library.js", library: { type: "module" } },
		"library-eval": {
			import: "./library-eval.js",
			library: { type: "module" }
		}
	},
	output: { module: true, filename: `[name]-${index}.mjs` },
	externalsType: "module",
	externals: {
		"./library.mjs": `./library-${index}.mjs`,
		"./library-eval.mjs": `./library-eval-${index}.mjs`
	},
	optimization: { concatenateModules: false }
}));
