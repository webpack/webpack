"use strict";

/** @typedef {import("../../../../").Configuration} Configuration */
/** @typedef {import("../../../../declarations/WebpackOptions").Environment} Environment */

/**
 * @param {string} testPath output directory of the test
 * @param {string} name name of the variant, also its output directory
 * @param {Environment} environment output environment of the variant
 * @returns {Configuration} configuration
 */
const config = (testPath, name, environment) => ({
	target: "web",
	externalsPresets: {
		node: true
	},
	entry: {
		main: "./index.js",
		shared: "./shared.js",
		middle: { import: "./middle.js", dependOn: "shared" },
		leaf: { import: "./leaf.js", dependOn: "middle" }
	},
	output: {
		path: `${testPath}/${name}`,
		filename: "[name].js",
		globalObject: "globalThis",
		chunkLoadingGlobal: `webpackChunkUmdDependOn_${name}`,
		environment,
		library: {
			name: "testLibrary",
			type: "umd"
		}
	}
});

/** @type {(env: EXPECTED_ANY, argv: { testPath?: string }) => Configuration[]} */
module.exports = (env, { testPath }) => [
	config(/** @type {string} */ (testPath), "modern", {}),
	config(/** @type {string} */ (testPath), "es5", {
		arrowFunction: false,
		const: false
	})
];
