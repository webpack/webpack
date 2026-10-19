"use strict";

const { sources } = require("../../../../");

const PLUGIN_NAME = "ChunkHashOrderPlugin";

// Declares a -> c -> b and runtime~a -> runtime~c against id order, then
// records the order `createHash` hashes chunks in.
class ChunkHashOrderPlugin {
	/**
	 * @param {import("../../../../lib/Compiler")} compiler compiler
	 */
	apply(compiler) {
		/** @type {Record<string, string>} */
		const declared = { a: "c", c: "b", "runtime~a": "runtime~c" };
		compiler.hooks.thisCompilation.tap(PLUGIN_NAME, (compilation) => {
			/** @type {import("../../../../lib/graph/Chunk")[]} */
			const hashed = [];
			compilation.hooks.chunkHashDependencies.tap(
				PLUGIN_NAME,
				(chunk, dependencies) => {
					const name = chunk.name && declared[chunk.name];
					if (name) {
						dependencies.add(
							/** @type {import("../../../../lib/graph/Chunk")} */ (
								compilation.namedChunks.get(name)
							)
						);
					}
				}
			);
			compilation.hooks.chunkHash.tap(PLUGIN_NAME, (chunk) => {
				hashed.push(chunk);
			});
			compilation.hooks.processAssets.tap(PLUGIN_NAME, () => {
				const { chunkGraph, runtimeTemplate } = compilation;
				/** @type {string[]} */
				const mismatches = [];
				let compared = 0;
				for (const chunk of hashed) {
					for (const target of hashed) {
						if (chunk === target || chunk.hasRuntime() || target.hasRuntime()) {
							continue;
						}
						const round = (
							/** @type {import("../../../../lib/graph/Chunk")} */ c
						) => chunkGraph.getNumberOfEntryModules(c) > 0;
						if (round(chunk) !== round(target)) continue;
						compared++;
						const before = hashed.indexOf(chunk) < hashed.indexOf(target);
						if (runtimeTemplate._hashRoundBefore(chunk, target) !== before) {
							mismatches.push(`${chunk.name} before ${target.name}`);
						}
					}
				}
				const a = /** @type {import("../../../../lib/graph/Chunk")} */ (
					compilation.namedChunks.get("a")
				);
				const order = {
					hashed: hashed.map((chunk) => chunk.name),
					mismatches,
					compared,
					dependenciesOfA: Array.from(
						compilation.getChunkHashDependencies(a),
						(chunk) => chunk.name
					)
				};
				compilation.emitAsset(
					"order.json",
					new sources.RawSource(JSON.stringify(order))
				);
			});
		});
	}
}

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	target: "node",
	entry: {
		bundle: "./index.js",
		a: "./a.js",
		b: "./b.js",
		c: "./c.js"
	},
	output: { filename: "[name].js" },
	node: { __dirname: false },
	plugins: [new ChunkHashOrderPlugin()],
	optimization: {
		minimize: false,
		chunkIds: "named",
		runtimeChunk: "multiple"
	}
};
