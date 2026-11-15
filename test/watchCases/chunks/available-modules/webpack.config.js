"use strict";

const { WebpackError } = require("../../../../");
const currentWatchStep = require("../../../helpers/currentWatchStep");

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	cache: true,
	optimization: {
		splitChunks: false,
		concatenateModules: false,
		usedExports: false
	},
	plugins: [
		{
			apply(compiler) {
				compiler.hooks.thisCompilation.tap("Test", (compilation) => {
					// Only step 1 has no late m.js in "parent", so "child" keeps its copy.
					const expected = currentWatchStep.step === "1" ? 1 : 0;
					compilation.hooks.afterChunks.tap("Test", () => {
						const child =
							/** @type {import("../../../../").ChunkGroup} */
							(compilation.namedChunkGroups.get("child"));
						let count = 0;
						for (const chunk of child.chunks) {
							for (const module of compilation.chunkGraph.getChunkModulesIterable(
								chunk
							)) {
								if (/[\\/]m\.js$/.test(module.identifier())) count++;
							}
						}
						if (count !== expected) {
							compilation.errors.push(
								new WebpackError(
									`"child" should contain m.js ${expected} times, not ${count}`
								)
							);
						}
					});
				});
			}
		}
	]
};
