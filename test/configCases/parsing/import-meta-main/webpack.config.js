"use strict";

// `import.meta.main` reads the factory's module parameter, whose name depends on
// the module itself and, once scope-hoisted, on the concatenation root.
/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		target: "node",
		entry: "./index.js",
		optimization: {
			concatenateModules: false
		}
	},
	{
		target: "node",
		entry: "./index.js",
		optimization: {
			concatenateModules: true
		}
	},
	{
		target: "node",
		entry: "./index.mjs",
		optimization: {
			concatenateModules: false
		}
	},
	{
		target: "node",
		entry: "./index.mjs",
		optimization: {
			concatenateModules: true
		}
	}
];
