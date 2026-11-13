"use strict";

const assert = require("assert");
const path = require("path");
const currentWatchStep = require("../../../helpers/currentWatchStep");

/** @type {import("webpack").Configuration[]} */
module.exports = ["memory", "filesystem"].map((type) => ({
	mode: "development",
	devtool: false,
	entry: { main: "./index.js", trigger: "./tick.js" },
	cache: type === "memory" ? { type: "memory" } : { type: "filesystem" },
	experiments: { cacheUnaffected: true },
	optimization: {
		splitChunks: false,
		concatenateModules: false,
		removeEmptyChunks: false
	},
	output: {
		filename: `${type}-[name].js`,
		chunkFilename: `${type}-[name].js`,
		clean: false
	},
	plugins: [
		(compiler) => {
			compiler.hooks.thisCompilation.tap(
				"AsyncBlockBoundaries",
				(compilation) => {
					compilation.hooks.afterOptimizeChunks.tap(
						"AsyncBlockBoundaries",
						() => {
							const origin = [...compilation.modules].find(
								(module) =>
									module.nameForCondition() ===
									path.join(compiler.context, "index.js")
							);
							assert(origin);
							const { chunkGraph } = compilation;
							const [blockA, blockB] = origin.blocks;
							const groupA = chunkGraph.getBlockChunkGroup(blockA);
							const groupB = chunkGraph.getBlockChunkGroup(blockB);
							assert(groupA && groupB);
							const chunkA = groupA.chunks[0];
							const chunkB = groupB.chunks[0];
							const padding = compilation.addChunk("padding");
							padding.runtime = chunkA.runtime;
							groupA.unshiftChunk(padding);
							padding.addGroup(groupA);
							if (
								currentWatchStep.step === "1" ||
								currentWatchStep.step === "2"
							) {
								// Both layouts flatten to [padding, a, b], but each import loads different chunks.
								groupA.removeChunk(chunkA);
								chunkA.removeGroup(groupA);
								groupB.unshiftChunk(chunkA);
								chunkA.addGroup(groupB);
								for (const module of chunkGraph.getChunkModulesIterable(
									chunkA
								)) {
									chunkGraph.disconnectChunkAndModule(chunkA, module);
									chunkGraph.connectChunkAndModule(padding, module);
								}
								for (const module of chunkGraph.getChunkModulesIterable(
									chunkB
								)) {
									chunkGraph.disconnectChunkAndModule(chunkB, module);
									chunkGraph.connectChunkAndModule(chunkA, module);
								}
							}
						}
					);
				}
			);
		}
	]
}));
