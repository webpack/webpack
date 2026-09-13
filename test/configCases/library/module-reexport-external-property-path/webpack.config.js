"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	entry: {
		main: "./index.js",
		library: { import: "./library.js", library: { type: "module" } }
	},
	output: { module: true, filename: "[name].mjs" },
	externalsType: "module",
	externals: {
		"./library.mjs": "./library.mjs",
		"plain-alias": "actual-module",
		"property-path": ["nested-module", "inner"]
	},
	optimization: { minimize: false }
};
