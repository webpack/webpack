"use strict";

/** @type {import("../../../../").Configuration[]} */
module.exports = [false, true].map((usedExports, index) => ({
	mode: "development",
	target: "node",
	output: {
		filename: `[name]-${index}.js`,
		chunkFilename: `[name]-${index}.js`
	},
	optimization: {
		splitChunks: {
			dedupDepth: 1,
			usedExports,
			cacheGroups: {
				default: false,
				defaultVendors: false,
				// Exercise an earlier priority before E is consumed.
				prime: {
					test: () => false,
					chunks: "all",
					minChunks: 2,
					minSize: 90,
					priority: 200
				},
				high: {
					test: /[\\/]m[12]\.js$/,
					chunks: (chunk) => chunk.name === "E",
					name: "high",
					minChunks: 1,
					minSize: 0,
					priority: 100,
					reuseExistingChunk: false
				},
				residual: {
					test: /[\\/]m[12]\.js$/,
					chunks: "all",
					minChunks: 2,
					minSize: 90,
					priority: 0,
					reuseExistingChunk: false
				}
			}
		}
	},
	plugins: [
		(compiler) => {
			compiler.hooks.compilation.tap(
				"residual-intersections",
				(compilation) => {
					compilation.hooks.afterSeal.tap("residual-intersections", () => {
						/** @type {import("../../../../").Chunk[][]} */
						const placements = [[], []];
						for (const chunk of compilation.chunks) {
							for (const module of compilation.chunkGraph.getChunkModulesIterable(
								chunk
							)) {
								const identifier = module.identifier().split("\\").join("/");
								for (let i = 0; i < 2; i++) {
									if (identifier.endsWith(`/m${i + 1}.js`)) {
										placements[i].push(chunk);
									}
								}
							}
						}
						// Initial sets ACDE and BCDE only intersect at CDE. After E is
						// consumed, the new intersection CD must be published with both modules.
						expect(placements[0]).toHaveLength(3);
						expect(placements[1]).toHaveLength(3);
						const shared = placements[0].filter(
							(chunk) => chunk.name !== "high" && placements[1].includes(chunk)
						);
						expect(shared).toHaveLength(1);
						for (const placementsForModule of placements) {
							expect(
								placementsForModule.some(
									(chunk) => chunk.name === "C" || chunk.name === "D"
								)
							).toBe(false);
						}
					});
				}
			);
		}
	]
}));
