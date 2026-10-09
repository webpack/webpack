"use strict";

/** @typedef {import("../../../../").Configuration} Configuration */
/** @typedef {import("../../../../declarations/WebpackOptions").LibraryOptions} LibraryOptions */

/**
 * `main` runs the assertions and stays library-free; the three entries below it form
 * a `dependOn` chain, so none of them carries a runtime of its own.
 * @param {string} testPath output directory of the test
 * @param {string} name name of the variant, also its output directory
 * @param {LibraryOptions} library library of the entries under test
 * @returns {Configuration} configuration
 */
const config = (testPath, name, library) => ({
	target: "web",
	externalsPresets: {
		node: true
	},
	entry: {
		main: "./index.js",
		shared: { import: "./shared.js", library },
		middle: { import: "./middle.js", dependOn: "shared", library },
		leaf: { import: "./leaf.js", dependOn: "middle", library }
	},
	output: {
		path: `${testPath}/${name}`,
		filename: "[name].js",
		globalObject: "globalThis",
		chunkLoadingGlobal: `webpackChunkDeclare_${name}`
	}
});

/** @type {(env: EXPECTED_ANY, argv: { testPath?: string }) => Configuration[]} */
module.exports = (env, { testPath }) => [
	config(/** @type {string} */ (testPath), "amd", {
		type: "amd",
		declareChunkDependencies: true
	}),
	config(/** @type {string} */ (testPath), "umd", {
		type: "umd",
		name: "testLibrary",
		declareChunkDependencies: true
	}),
	config(/** @type {string} */ (testPath), "system", {
		type: "system",
		declareChunkDependencies: true
	})
];
