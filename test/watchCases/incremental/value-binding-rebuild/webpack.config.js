"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	optimization: {
		concatenateModules: false,
		minimize: false,
		inlineExports: false
	},
	plugins: [
		(compiler) => {
			/** @type {import("webpack").ChunkGraph | undefined} */
			let previousChunkGraph;
			compiler.hooks.afterCompile.tap("CheckChunkGraphReuse", (compilation) => {
				if (!compiler.watchMode) return;
				if (previousChunkGraph !== undefined) {
					expect(compilation.chunkGraph).toBe(previousChunkGraph);
				}
				previousChunkGraph = compilation.chunkGraph;
			});
		}
	]
};
