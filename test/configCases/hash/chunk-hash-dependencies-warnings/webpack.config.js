"use strict";

const PLUGIN_NAME = "UnorderableHashDependenciesPlugin";

// a and b name each other, and the split `shared` chunk names `a`, which is
// hashed in a later round: neither can be honored, so both are reported.
class UnorderableHashDependenciesPlugin {
	/**
	 * @param {import("../../../../").Compiler} compiler compiler
	 */
	apply(compiler) {
		/** @type {Record<string, string>} */
		const declared = { a: "b", b: "a", shared: "a" };
		compiler.hooks.thisCompilation.tap(PLUGIN_NAME, (compilation) => {
			compilation.hooks.chunkHashDependencies.tap(
				PLUGIN_NAME,
				(chunk, dependencies) => {
					const name = chunk.name && declared[chunk.name];
					if (name) {
						dependencies.add(
							/** @type {import("../../../../").Chunk} */ (
								compilation.namedChunks.get(name)
							)
						);
					}
				}
			);
		});
	}
}

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	target: "node",
	entry: { bundle: "./index.js", a: "./a.js", b: "./b.js" },
	output: { filename: "[name].js" },
	plugins: [new UnorderableHashDependenciesPlugin()],
	optimization: {
		minimize: false,
		chunkIds: "named",
		runtimeChunk: "single",
		splitChunks: {
			cacheGroups: {
				shared: {
					name: "shared",
					test: /shared\.js$/,
					chunks: "all",
					enforce: true
				}
			}
		}
	}
};
