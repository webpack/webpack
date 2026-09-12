"use strict";

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{ type: "module", minimize: false },
	{ type: "module", minimize: true },
	{ type: "modern-module", minimize: false },
	{ type: "modern-module", minimize: true }
].map(({ type, minimize }, index) => ({
	mode: minimize ? "production" : "development",
	entry: {
		main: "./index.js",
		library: { import: "./library.js", library: { type } }
	},
	output: { module: true, filename: `[name]${index}.mjs` },
	externalsType: "module",
	externals: {
		"./library.mjs": `./library${index}.mjs`,
		alias: "actual-module",
		"alias-again": "actual-module",
		"array-alias": ["actual-array-module"],
		"record-alias": {
			module: "actual-record-module",
			commonjs: "unused-commonjs-module"
		}
	},
	optimization: { minimize }
}));
