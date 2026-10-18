"use strict";

/** @type {import("../../../../").Configuration[]} */
module.exports = ["node14", "web", "universal"].map((target, index) => ({
	target,
	entry: {
		main: "./index.js",
		library: { import: "./library.js", library: { type: "module" } }
	},
	output: { module: true, filename: `[name]-${index}.mjs` },
	externalsType: "module",
	externals: { "./library.mjs": `./library-${index}.mjs` },
	optimization: { concatenateModules: false }
}));
