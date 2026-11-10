"use strict";

/** @type {string | undefined} */
let previousHash;

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	module: { rules: [{ test: /a\.js$/, sideEffects: false }] },
	optimization: { usedExports: true, innerGraph: true, sideEffects: true },
	plugins: [
		(compiler) => {
			compiler.hooks.compilation.tap(
				"InactiveDependencyHash",
				(compilation) => {
					compilation.hooks.afterHash.tap("InactiveDependencyHash", () => {
						for (const module of compilation.modules) {
							if (!/m\.js$/.test(module.nameForCondition() || "")) continue;
							const { chunkGraph } = compilation;
							const [runtime] = chunkGraph.getModuleRuntimes(module);
							const hash = chunkGraph.getModuleGraphHash(module, runtime);
							// m.js uses nothing of a.js, so which of its exports index.js uses
							// must not reach m.js's hash
							if (previousHash !== undefined && hash !== previousHash) {
								compilation.errors.push(
									new compiler.webpack.WebpackError("m.js hash changed")
								);
							}
							previousHash = hash;
						}
					});
				}
			);
		}
	]
};
