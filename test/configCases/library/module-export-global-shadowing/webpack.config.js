"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node14",
	entry: {
		main: "./index.js",
		library: { import: "./library.js", library: { type: "module" } }
	},
	output: { module: true, filename: "[name].mjs" },
	externalsType: "module",
	externals: { "./library.mjs": "./library.mjs" },
	optimization: { concatenateModules: true }
};
