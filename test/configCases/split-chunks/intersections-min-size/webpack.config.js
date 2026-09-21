"use strict";

// Ported from rspack's `configCases/split-chunks/intersections-min-size`, so
// both bundlers answer the same configurations the same way.

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const sharedSize = [0, 1, 2].reduce(
	(size, index) =>
		size + fs.statSync(path.join(__dirname, `m${index}.js`)).size,
	0
);

/**
 * Defines one configuration of the suite.
 * @typedef {object} Variant
 * @property {"production" | "development" | "none"=} mode the mode to build in
 * @property {boolean} usedExports whether chunk sets are grouped by used exports
 * @property {number=} dedupDepth rounds of discovery, or the mode's default
 * @property {boolean=} belowThreshold whether the shared modules miss `minSize` together
 * @property {boolean=} higherOrder whether the entries share a module pairwise
 * @property {boolean=} singleton whether one chunk is enough to share through
 * @property {boolean=} filtered whether a chunk filter merges the intersections
 */

/** @type {Variant[]} */
const variants = [
	{ usedExports: false },
	{ usedExports: true },
	{ usedExports: false, dedupDepth: 0 },
	{ usedExports: true, dedupDepth: 0 },
	{ usedExports: false, dedupDepth: 1 },
	{ usedExports: true, dedupDepth: 1 },
	{ usedExports: true, dedupDepth: 1, belowThreshold: true },
	{ usedExports: false, dedupDepth: 1, higherOrder: true },
	{ usedExports: true, dedupDepth: 1, higherOrder: true },
	{ usedExports: false, dedupDepth: 2, higherOrder: true },
	{ usedExports: true, dedupDepth: 2, higherOrder: true },
	{ usedExports: false, dedupDepth: 3, higherOrder: true },
	{ usedExports: true, dedupDepth: 3, higherOrder: true },
	{ usedExports: false, dedupDepth: 1, singleton: true },
	{ usedExports: false, dedupDepth: 1, filtered: true },
	{ usedExports: true, dedupDepth: 1, filtered: true },
	{ mode: "development", usedExports: false },
	{ mode: "development", usedExports: true },
	{ mode: "development", usedExports: false, dedupDepth: 1 },
	{ mode: "development", usedExports: true, dedupDepth: 1 }
];

/** @type {import("../../../../").Configuration[]} */
module.exports = variants.map(
	(
		{
			mode = "production",
			usedExports,
			dedupDepth,
			belowThreshold,
			higherOrder,
			singleton,
			filtered
		},
		index
	) => {
		const depth =
			dedupDepth === undefined ? (mode === "production" ? 1 : 0) : dedupDepth;
		// In the higher-order case every first-round pair misses `minSize`, so
		// only a second round reaches the chunks all three modules share.
		const extracted =
			depth > 0 && !belowThreshold && (!higherOrder || depth >= 2);
		return {
			name: `intersections-${index}`,
			mode,
			target: "node",
			entry: {
				a: "./a",
				...(singleton ? {} : { b: "./b" }),
				...(higherOrder || filtered
					? { c: "./pair01", d: "./pair02", e: "./pair12" }
					: { c: "./c0", d: "./c1", e: "./c2" }),
				...(filtered ? { p0: "./c0", p1: "./c1", p2: "./c2" } : {})
			},
			output: {
				filename: `[name]-${index}.js`,
				chunkFilename: `[name]-${index}.js`
			},
			optimization: {
				minimize: false,
				concatenateModules: false,
				chunkIds: "named",
				splitChunks: {
					chunks: filtered
						? (chunk) => !["c", "d", "e"].includes(chunk.name || "")
						: "all",
					usedExports,
					...(dedupDepth === undefined ? {} : { dedupDepth }),
					...(singleton ? { minChunks: 1 } : {}),
					minSize: sharedSize + (belowThreshold ? 1 : 0),
					minSizeReduction: 0,
					maxInitialRequests: Infinity,
					maxAsyncRequests: Infinity,
					cacheGroups: { defaultVendors: false }
				}
			},
			plugins: [
				{
					apply(compiler) {
						compiler.hooks.afterEnvironment.tap(
							"AssertDedupDepthDefault",
							() => {
								const { splitChunks } = compiler.options.optimization;
								assert.ok(splitChunks);
								assert.strictEqual(
									splitChunks.dedupDepth,
									depth,
									`config ${index}`
								);
							}
						);
						compiler.hooks.done.tap("AssertIntersectionCandidates", (stats) => {
							const { chunkGraph, modules } = stats.compilation;
							const shared = [...modules].filter((module) =>
								/[\\/]m[012]\.js$/.test(module.identifier())
							);
							assert.strictEqual(shared.length, 3, `config ${index}`);
							const sharedChunks = shared.map((module) =>
								chunkGraph.getModuleChunks(module)
							);
							for (const chunks of sharedChunks) {
								assert.strictEqual(
									chunks.length,
									filtered
										? 4
										: higherOrder
											? extracted
												? 3
												: 4
											: extracted || singleton
												? 2
												: 3,
									`config ${index}`
								);
							}
							// Each raw pairwise intersection in the filtered case holds two
							// modules and misses `minSize`. Filtering c, d and e maps them
							// all onto {a,b}, where all three modules pass it together.
							const together = sharedChunks[0].filter((chunk) =>
								sharedChunks.every((chunks) => chunks.includes(chunk))
							);
							assert.strictEqual(
								together.length,
								extracted || singleton ? 1 : 2,
								`config ${index}`
							);
						});
					}
				}
			]
		};
	}
);
