"use strict";

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	["none", true],
	["production", true],
	["production", false]
].map(([mode, concatenateModules], index) => ({
	mode: /** @type {"none" | "production"} */ (mode),
	target: "node14",
	entry: {
		main: "./index.js",
		library: { import: "./library.js", library: { type: "module" } }
	},
	output: { module: true, filename: `[name]-${index}.mjs` },
	externalsType: "module",
	externals: { "./library.mjs": `./library-${index}.mjs` },
	optimization: { concatenateModules: Boolean(concatenateModules) }
}));
