"use strict";

/** @typedef {import("../../../../").Configuration} Configuration */
/** @typedef {import("../../../../declarations/WebpackOptions").LibraryOptions} LibraryOptions */

/**
 * `shared` carries the runtime for the two entries below it, so it stays library-free:
 * with the commonjs chunk format a runtime chunk exports `__webpack_require__` itself.
 * @param {string} testPath output directory of the test
 * @param {string} name name of the variant, also its output directory
 * @param {LibraryOptions} library library of the entries that depend on another one
 * @returns {Configuration} configuration
 */
const config = (testPath, name, library) => ({
	target: "node",
	entry: {
		main: "./index.js",
		shared: "./shared.js",
		middle: { import: "./middle.js", dependOn: "shared", library },
		leaf: { import: "./leaf.js", dependOn: "middle", library }
	},
	output: {
		path: `${testPath}/${name}`,
		filename: "[name].js"
	}
});

/** @type {(env: EXPECTED_ANY, argv: { testPath?: string }) => Configuration[]} */
module.exports = (env, { testPath }) => [
	config(/** @type {string} */ (testPath), "umd", {
		name: "testLibrary",
		type: "umd"
	}),
	config(/** @type {string} */ (testPath), "commonjs", { type: "commonjs" })
];
