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

/** @type {[string, string, boolean][]} */
const expectations = [
	// "module" gets both from module-c only after its children were connected.
	["module", "late.js", true],
	["module", "late-dep.js", true],
	// Every route to it loads "module" first.
	["inherits-late", "late.js", false],
	// Reached only below "inherits-late", which imports it back.
	["inherits-late-cycle", "late-dep.js", false],
	// main reaches it directly, and main does not load late.js.
	["keeps-late", "late.js", true]
];

/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: {
		main: "./index.js"
	},
	output: {
		filename: "[name].js"
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
										`Chunk "${chunkName}" should ${expected ? "" : "not "}contain ${request}`
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
