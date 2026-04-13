"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	plugins: [
		{
			apply: (compiler) => {
				compiler.hooks.compilation.tap("test", (compilation) => {
					compilation.hooks.optimize.tap("test", () => {
						const { chunkGraph } = compilation;
						const [chunk] = compilation.chunks;
						const modules = chunkGraph.getChunkModules(chunk);

						if (modules.length === 0) {
							throw new Error("No modules found in chunk");
						}

						const m = modules[0];
						const mock = {
							identifier: () => "mock-module",
							getSourceTypes: () => ["javascript"],
							size: () => 0
						};

						// @ts-expect-error for tests
						chunkGraph.replaceModule(m, mock);

						// @ts-expect-error for tests
						if (!chunkGraph.isModuleInChunk(mock, chunk)) {
							throw new Error("replaceModule failed (new module missing)");
						}
						if (chunkGraph.isModuleInChunk(m, chunk)) {
							throw new Error("replaceModule failed (old module remains)");
						}

						// Restore original state for downstream stats
						// @ts-expect-error for tests
						chunkGraph.replaceModule(mock, m);

						chunkGraph.disconnectChunkAndModule(chunk, m);
						if (chunkGraph.isModuleInChunk(m, chunk)) {
							throw new Error("disconnectChunkAndModule failed");
						}

						chunkGraph.connectChunkAndModule(chunk, m);
						if (!chunkGraph.isModuleInChunk(m, chunk)) {
							throw new Error("connectChunkAndModule failed");
						}

						const [group] = compilation.chunkGroups;
						if (group) {
							group.getChildren();
						}
					});
				});
			}
		}
	]
};
