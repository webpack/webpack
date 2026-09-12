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
		external: "external"
	},
	optimization: { minimize }
}));
