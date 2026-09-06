"use strict";

const fs = require("fs");
const path = require("path");

const sharedSize = [0, 1, 2].reduce(
	(sum, index) => sum + fs.statSync(path.join(__dirname, `m${index}.js`)).size,
	0
);

/**
 * Creates one intersection test configuration.
 * @param {object} options test options
 * @param {boolean=} options.usedExports whether exports are grouped by runtime usage
 * @param {boolean=} options.belowThreshold whether the combined group misses minSize
 * @param {boolean=} options.higherOrder whether three inputs are needed for the candidate
 * @param {boolean=} options.named whether the cache group uses an explicit name
 * @param {boolean=} options.reductionOnly whether only minSizeReduction enables discovery
 * @param {number=} options.minChunks the minimum number of shared chunks
 * @returns {import("../../../../").Configuration} the test configuration
 */
const config = ({
	usedExports = false,
	belowThreshold = false,
	higherOrder = false,
	named = false,
	reductionOnly = false,
	minChunks = 2
}) => {
	const name = [
		usedExports ? "exports" : "all-exports",
		belowThreshold ? "below" : "exact",
		higherOrder ? "higher" : "pair",
		named ? "named" : "unnamed",
		reductionOnly ? "reduction" : "size",
		`min-${minChunks}`
	].join("-");
	return {
		name,
		mode: "production",
		target: "node",
		entry: {
			a: "./a",
			b: "./b",
			...(higherOrder
				? { c: "./pair01", d: "./pair02", e: "./pair12" }
				: { c: "./c0", d: "./c1", e: "./c2" })
		},
		output: { filename: `${name}-[name].js` },
		optimization: {
			minimize: false,
			concatenateModules: false,
			splitChunks: {
				chunks: "all",
				usedExports,
				minChunks,
				minSize: reductionOnly ? 0 : sharedSize + (belowThreshold ? 1 : 0),
				minSizeReduction: reductionOnly ? sharedSize + 1 : 0,
				maxInitialRequests: Infinity,
				maxAsyncRequests: Infinity,
				cacheGroups: {
					defaultVendors: false,
					default: {
						minChunks,
						...(named
							? {
									name: (_module, chunks) => {
										if (chunks.length === 2) {
											throw new Error("Synthetic chunks passed to name");
										}
										return "shared";
									}
								}
							: {})
					}
				}
			}
		},
		plugins: [
			(compiler) => {
				compiler.hooks.done.tap("AssertIntersectionCandidates", (stats) => {
					const { chunkGraph, modules } = stats.compilation;
					const shouldSplit = !belowThreshold && minChunks === 2;
					const shared = [...modules].filter((module) => {
						const name = module.nameForCondition();
						return name !== null && /[\\/]m[012]\.js$/.test(name);
					});
					expect(shared).toHaveLength(3);
					for (const module of shared) {
						expect(chunkGraph.getModuleChunks(module)).toHaveLength(
							shouldSplit ? (named ? 1 : higherOrder ? 3 : 2) : 3
						);
					}
					const common = chunkGraph
						.getModuleChunks(shared[0])
						.filter((chunk) =>
							shared.every((module) =>
								chunkGraph.getModuleChunks(module).includes(chunk)
							)
						);
					expect(common).toHaveLength(shouldSplit ? 1 : 2);
				});
			}
		]
	};
};

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{},
	{ usedExports: true },
	{ usedExports: true, belowThreshold: true },
	{ higherOrder: true },
	{ usedExports: true, higherOrder: true },
	{ named: true },
	{ reductionOnly: true },
	{ minChunks: 3 }
].map(config);
