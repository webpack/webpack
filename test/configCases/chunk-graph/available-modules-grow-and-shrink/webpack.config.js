"use strict";

const path = require("path");
const { WebpackError } = require("../../../../");

/** @typedef {import("../../../../").Compilation} Compilation */

/**
 * @param {Compilation} compilation the compilation
 * @param {string} chunkName the chunk to look in
 * @param {string} request the module file to look for
 * @returns {boolean} whether the module is in that chunk
 */
const hasModule = (compilation, chunkName, request) => {
	const chunk = compilation.namedChunks.get(chunkName);
	if (!chunk) throw new Error(`Chunk "${chunkName}" was not created`);
	const resource = path.resolve(__dirname, request);
	for (const module of compilation.chunkGraph.getChunkModulesIterable(chunk)) {
		if (module.nameForCondition() === resource) return true;
	}
	return false;
};

// "other" reaches "p" later than "main". In one connect batch the result of "p"
// gains p2.js and b.js and loses a.js, and "p" finds a new block to "d".
/** @type {[string, string, boolean][]} */
const expectations = [
	["p", "b.js", true],
	// "other" does not load a.js, so "p" cannot give it to "c".
	["c", "a.js", true],
	// Every route to "c" loads "p" first.
	["c", "b.js", false],
	// The block to "d" is found in the same batch in which "p" grows.
	["d", "d.js", true]
];

/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: {
		main: "./index.js",
		other: "./other.js"
	},
	output: {
		filename: "[name].js"
	},
	optimization: {
		splitChunks: false,
		concatenateModules: false,
		usedExports: false
	},
	plugins: [
		{
			apply(compiler) {
				compiler.hooks.compilation.tap("Test", (compilation) => {
					compilation.hooks.afterChunks.tap("Test", () => {
						for (const [chunkName, request, expected] of expectations) {
							if (hasModule(compilation, chunkName, request) !== expected) {
								compilation.errors.push(
									new WebpackError(
										`Chunk "${chunkName}" should ${
											expected ? "" : "not "
										}contain ${request}`
									)
								);
							}
						}
					});
				});
			}
		}
	]
};
